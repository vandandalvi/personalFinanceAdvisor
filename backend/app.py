from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv
import google.generativeai as genai
import statistics

load_dotenv() 

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",  
    "http://localhost:5174",  
    "https://*.vercel.app",
    "https://vandansfinancemanager.vercel.app",
    "https://your-app-name.vercel.app"  # Update with your actual Vercel URL
], supports_credentials=True)


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

ANSWER_MODE = os.getenv("ANSWER_MODE", "ai-only").strip().lower()
CSV_CONTEXT_MAX_CHARS = int(os.getenv("CSV_CONTEXT_MAX_CHARS", "120000"))


def _llm_chat(prompt: str):
    """Call Gemini API directly.
    Returns (answer, meta) or raises an Exception with the last error.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("LLM client not configured")

    # Try different Gemini models with correct identifiers (based on actual available models)
    candidates = [
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-flash-latest",
        "models/gemini-2.5-pro",
        "models/gemini-2.0-flash-exp",
        "models/gemini-pro-latest",
    ]

    last_err = None
    for model_name in candidates:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text, {"model": model_name}
        except Exception as e:
            msg = str(e)
            last_err = msg
            # If it's a NOT_FOUND/404 for a given model, try the next
            if "404" in msg or "NOT_FOUND" in msg or "was not found" in msg or "not found" in msg:
                continue
            # other errors should stop the loop
            break

    raise RuntimeError(last_err or "Unknown LLM error")


def _savings_intent(text: str) -> bool:
    t = (text or "").lower()
    keywords = [
        "save", "saving", "savings", "waste", "wasted", "useless",
        "cut down", "reduce", "optimize", "where can i save",
    ]
    return any(k in t for k in keywords)


def _local_savings_suggestions(df: pd.DataFrame) -> str:
    if df is None or df.empty or "Amount" not in df.columns:
        return "I need valid transaction data (Amount column) to suggest savings."
    # Basic aggregates
    cat_totals = (
        df.groupby("Category")["Amount"].sum().sort_values(ascending=False)
        if "Category" in df.columns else None
    )
    cat_medians = (
        df.groupby("Category")["Amount"].median() if "Category" in df.columns else None
    )
    # Treat Description as merchant/item label
    desc_stats = (
        df.groupby(["Description"])
          .agg(total=("Amount", "sum"), avg=("Amount", "mean"), count=("Amount", "count"))
          .sort_values("total", ascending=False)
          .reset_index()
    )
    # Attach category for each description by its most frequent category
    if "Category" in df.columns:
        top_cat = (
            df.groupby(["Description", "Category"]).size().reset_index(name="n")
              .sort_values(["Description", "n"], ascending=[True, False])
              .drop_duplicates("Description")[["Description", "Category"]]
        )
        desc_stats = desc_stats.merge(top_cat, on="Description", how="left")
    # Compute premium vs category median
    if cat_medians is not None and not cat_medians.empty and "Category" in desc_stats.columns:
        def premium(row):
            cat = row.get("Category")
            med = cat_medians.get(cat, None)
            if med and med > 0:
                return (row["avg"] - med) / med
            return 0.0
        desc_stats["premium_vs_cat_median"] = desc_stats.apply(premium, axis=1)
    else:
        desc_stats["premium_vs_cat_median"] = 0.0

    # Detect subscription-like: same amount repeating (low unique amounts and count>=2)
    subs = []
    if "Description" in df.columns:
        for desc, grp in df.groupby("Description"):
            amounts = grp["Amount"].dropna()
            if len(amounts) >= 2 and amounts.nunique() == 1:
                subs.append((desc, float(amounts.iloc[0]), len(amounts)))

    suggestions = []
    # 1) Biggest categories to target
    if cat_totals is not None:
        top_cats = cat_totals.head(3)
        if len(top_cats) > 0:
            cat_lines = ", ".join([f"{c}: Rs {v:.0f}" for c, v in top_cats.items()])
            suggestions.append(f"Your top spending categories are {cat_lines}. Consider setting weekly limits for these.")

    # 2) High-spend merchants/items with specific actionable advice
    top_desc = desc_stats.head(5)
    for _, r in top_desc.iterrows():
        d = r["Description"]
        total = r["total"]
        avg = r["avg"]
        cnt = int(r["count"]) if pd.notna(r["count"]) else 0
        cat = r.get("Category", None)
        prem = r.get("premium_vs_cat_median", 0.0) or 0.0
        if prem > 0.2:  # >20% above category median
            suggestions.append(
                f"You spent Rs {total:.0f} on {d}, which is {prem*100:.0f}% higher than your {cat} median. You can save by switching to cheaper alternatives or reducing frequency."
            )
        elif total > 1000:  # High spending regardless of premium
            suggestions.append(
                f"You spent Rs {total:.0f} on {d} over {cnt} visits. Consider reducing this habit to save money."
            )

    # 3) Subscriptions
    for desc, amt, cnt in subs:
        suggestions.append(
            f"Subscription-like: {desc} appears {cnt}× at Rs {amt:.0f}. Check for plan downgrades or duplicate charges."
        )

    # Keep it concise
    if not suggestions:
        return "I didn’t find clear savings patterns. Try asking about a specific category or merchant."
    # Limit to top 6 suggestions
    return "Here are ways you can save based on your transactions:\n- " + "\n- ".join(suggestions[:6])


def _summaries_for_llm(df: pd.DataFrame) -> str:
    lines = []
    if df is None or df.empty:
        return ""
    if "Category" in df.columns and "Amount" in df.columns:
        cat_totals = df.groupby("Category")["Amount"].sum().sort_values(ascending=False)
        top = ", ".join([f"{c}: Rs {v:.0f}" for c, v in cat_totals.head(5).items()])
        lines.append(f"Top categories by spend: {top}")
    if "Description" in df.columns and "Amount" in df.columns:
        desc_totals = df.groupby("Description")["Amount"].sum().sort_values(ascending=False)
        topd = ", ".join([f"{d}: Rs {v:.0f}" for d, v in desc_totals.head(5).items()])
        lines.append(f"Top merchants/items: {topd}")
    return "\n".join(lines)

# Globals for uploaded data
transactions_df = None
csv_text = ""


def _normalize_columns_bank_specific(df: pd.DataFrame, bank: str) -> pd.DataFrame:
    """Bank-specific column normalization and data processing."""
    if df is None or df.empty:
        return df
    
    print(f"Processing {bank} format. Original columns: {df.columns.tolist()}")
    
    if bank == 'sbi':
        return _process_sbi_format(df)
    elif bank == 'kotak':
        return _process_kotak_format(df)
    elif bank == 'axis':
        return _process_axis_format(df)
    else:
        # Fallback to generic normalization
        return _normalize_columns(df)

def _process_sbi_format(df: pd.DataFrame) -> pd.DataFrame:
    """Process SBI bank statement format."""
    # SBI columns: Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance
    mapping = {}
    for col in df.columns:
        lc = str(col).strip().lower()
        if 'txn date' in lc or 'transaction date' in lc:
            mapping[col] = "Date"
        elif 'description' in lc or 'particulars' in lc:
            mapping[col] = "Description"
        elif 'debit' in lc:
            mapping[col] = "Debit"
        elif 'credit' in lc:
            mapping[col] = "Credit"
    
    if mapping:
        df = df.rename(columns=mapping)
    
    # Process SBI amounts - handle empty strings and combine Debit and Credit
    if "Debit" in df.columns and "Credit" in df.columns:
        # Replace empty strings with 0
        df["Debit"] = df["Debit"].replace('', 0)
        df["Credit"] = df["Credit"].replace('', 0)
        df["Debit"] = pd.to_numeric(df["Debit"], errors="coerce").fillna(0)
        df["Credit"] = pd.to_numeric(df["Credit"], errors="coerce").fillna(0)
        # Expenses are debits (negative), income is credits (positive)
        df["Amount"] = df["Credit"] - df["Debit"]
    
    # Clean and categorize SBI descriptions
    if "Description" in df.columns:
        df["Category"] = df["Description"].apply(_categorize_sbi_transaction)
        df["Description"] = df["Description"].apply(_clean_sbi_description)
    
    # Process dates - handle SBI date format like "1 Jan 2024"
    if "Date" in df.columns:
        try:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce", format='%d %b %Y')
        except:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    
    return df

def _process_kotak_format(df: pd.DataFrame) -> pd.DataFrame:
    """Process Kotak bank statement format."""
    # Kotak columns: Date, Particulars, Debit, Credit, Balance
    mapping = {}
    for col in df.columns:
        lc = str(col).strip().lower()
        if 'date' in lc:
            mapping[col] = "Date"
        elif 'particulars' in lc or 'description' in lc or 'narration' in lc:
            mapping[col] = "Description"
        elif 'debit' in lc or 'withdrawal' in lc:
            mapping[col] = "Debit"
        elif 'credit' in lc or 'deposit' in lc:
            mapping[col] = "Credit"
    
    if mapping:
        df = df.rename(columns=mapping)
    
    # Process Kotak amounts - handle empty strings
    if "Debit" in df.columns and "Credit" in df.columns:
        df["Debit"] = df["Debit"].replace('', 0)
        df["Credit"] = df["Credit"].replace('', 0)
        df["Debit"] = pd.to_numeric(df["Debit"], errors="coerce").fillna(0)
        df["Credit"] = pd.to_numeric(df["Credit"], errors="coerce").fillna(0)
        df["Amount"] = df["Credit"] - df["Debit"]
    
    # Clean and categorize Kotak descriptions
    if "Description" in df.columns:
        print(f"Categorizing {len(df)} Kotak transactions...")
        df["Category"] = df["Description"].apply(_categorize_kotak_transaction)
        # Debug: print investment transactions
        investment_txns = df[df["Category"] == "Investment"]
        if not investment_txns.empty:
            print(f"Found {len(investment_txns)} Investment transactions:")
            for idx, row in investment_txns.iterrows():
                print(f"  - {row['Description']} -> {row['Category']}")
        df["Description"] = df["Description"].apply(_clean_kotak_description)
    
    # Process dates - handle Kotak date format like "01/01/2024"
    if "Date" in df.columns:
        try:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce", format='%d/%m/%Y')
        except:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    
    return df

def _process_axis_format(df: pd.DataFrame) -> pd.DataFrame:
    """Process Axis bank statement format."""
    # Axis columns: Tran Date, Description, Chq/Ref Number, Value Dt, Withdrawal Amt, Deposit Amt, Closing Balance
    mapping = {}
    for col in df.columns:
        lc = str(col).strip().lower()
        if 'tran date' in lc or 'transaction date' in lc or 'date' in lc:
            mapping[col] = "Date"
        elif 'description' in lc or 'particulars' in lc:
            mapping[col] = "Description"
        elif 'withdrawal' in lc or 'debit' in lc:
            mapping[col] = "Debit"
        elif 'deposit' in lc or 'credit' in lc:
            mapping[col] = "Credit"
    
    if mapping:
        df = df.rename(columns=mapping)
    
    # Process Axis amounts - handle empty strings
    if "Debit" in df.columns and "Credit" in df.columns:
        df["Debit"] = df["Debit"].replace('', 0)
        df["Credit"] = df["Credit"].replace('', 0)
        df["Debit"] = pd.to_numeric(df["Debit"], errors="coerce").fillna(0)
        df["Credit"] = pd.to_numeric(df["Credit"], errors="coerce").fillna(0)
        df["Amount"] = df["Credit"] - df["Debit"]
    
    # Clean and categorize Axis descriptions
    if "Description" in df.columns:
        df["Category"] = df["Description"].apply(_categorize_axis_transaction)
        df["Description"] = df["Description"].apply(_clean_axis_description)
    
    # Process dates - handle Axis date format like "01/01/2024"
    if "Date" in df.columns:
        try:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce", format='%d/%m/%Y')
        except:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    
    return df

def _categorize_sbi_transaction(description: str) -> str:
    """Categorize SBI transactions based on description patterns."""
    if pd.isna(description):
        return "Other"
    
    desc = str(description).upper()
    
    # Investment - Stocks, Mutual Funds, Trading
    if any(keyword in desc for keyword in ['UPSTOX', 'INDIAN CLEARING', 'ZERODHA', 'GROWW', 'MUTUAL FUND', 'STOCK', 'TRADING', 'INVESTMENT', 'DEMAT', 'CLEARING']):
        return "Investment"
    
    # Credit Card Payments
    elif any(keyword in desc for keyword in ['CRED', 'CREDIT CARD', 'CC PAYMENT', 'CARD PAYMENT']):
        return "Credit Card"
    
    # UPI Food Services
    elif any(keyword in desc for keyword in ['SWIGGY', 'ZOMATO', 'FOOD', 'RESTAURANT', 'CAFE', 'PIZZA', 'DOMINOS', 'KFC', 'MCDONALD', 'BURGER']):
        return "Food & Dining"
    
    # Transportation - includes Metro
    elif any(keyword in desc for keyword in ['UBER', 'OLA', 'METRO', 'PETROL', 'FUEL', 'TRANSPORT', 'CAB', 'RAPIDO', 'BPCL', 'HP', 'IOCL', 'MUMBAI METRO']):
        return "Transportation"
    
    # Shopping
    elif any(keyword in desc for keyword in ['AMAZON', 'FLIPKART', 'SHOPPING', 'MYNTRA', 'AJIO', 'MEESHO', 'PAYTM MALL']):
        return "Shopping"
    
    # Entertainment & Subscriptions
    elif any(keyword in desc for keyword in ['NETFLIX', 'SPOTIFY', 'MOVIE', 'BOOKMYSHOW', 'PRIME', 'HOTSTAR', 'YOUTUBE', 'DISNEY']):
        return "Entertainment"
    
    # Utilities & Bills
    elif any(keyword in desc for keyword in ['ELECTRICITY', 'MOBILE', 'RECHARGE', 'BILL', 'AIRTEL', 'JIO', 'VODAFONE', 'BSNL']):
        return "Utilities"
    
    # ATM/Cash Withdrawals
    elif any(keyword in desc for keyword in ['ATM', 'CASH', 'WDL', 'WITHDRAWAL']):
        return "Cash Withdrawal"
    
    # Money Transfers
    elif any(keyword in desc for keyword in ['TRANSFER', 'NEFT', 'IMPS', 'UPI/DR', 'UPI/CR']):
        return "Money Transfer"
    
    # Income & Credits
    elif any(keyword in desc for keyword in ['SALARY', 'CREDIT INTEREST', 'DIVIDEND', 'NEFT INWARD', 'RTGS']):
        return "Income"
    
    # Banking Charges
    elif any(keyword in desc for keyword in ['AMC', 'CHARGES', 'FEE', 'PENALTY']):
        return "Bank Charges"
    
    # If no recognizable pattern found, categorize as Other
    else:
        return "Other"

def _categorize_kotak_transaction(description: str) -> str:
    """Categorize Kotak transactions - similar logic to SBI."""
    return _categorize_sbi_transaction(description)  # Similar patterns

def _categorize_axis_transaction(description: str) -> str:
    """Categorize Axis transactions - similar logic to SBI."""
    return _categorize_sbi_transaction(description)  # Similar patterns

def _clean_sbi_description(description: str) -> str:
    """Clean SBI transaction descriptions for better readability."""
    if pd.isna(description):
        return "Unknown Transaction"
    
    desc = str(description).strip()
    
    # Clean UPI transactions - extract merchant names
    if "UPI/DR" in desc or "UPI/CR" in desc:
        # Extract merchant from UPI patterns like "BY TRANSFER-UPI/DR/400252792161/MAHAB"
        parts = desc.split("/")
        if len(parts) >= 4:
            merchant = parts[-1]  # Last part is usually merchant
            if merchant and len(merchant) > 2:
                return f"UPI Payment - {merchant.title()}"
        return "UPI Payment"
    
    # Clean transfer descriptions
    elif "BY TRANSFER" in desc:
        if "MAHAB" in desc:
            return "Money Transfer"
        return "Bank Transfer"
    
    elif "TO TRANSFER" in desc:
        if "Hamara" in desc:
            return "Payment to Hamara"
        elif "SONU" in desc:
            return "Payment to Contact"
        return "Money Transfer"
    
    # Clean AMC and charges
    elif "AMC" in desc:
        return "Annual Maintenance Charge"
    
    elif "ECS/ACH RETURN" in desc:
        return "ECS Return Charges"
    
    # NEFT transactions
    elif "NEFT" in desc:
        if "SALARY" in desc:
            return "Salary Credit"
        return "NEFT Transfer"
    
    # ATM transactions
    elif "ATM" in desc and "WDL" in desc:
        return "ATM Cash Withdrawal"
    
    # Return cleaned description (first 40 characters)
    return desc[:40] + "..." if len(desc) > 40 else desc

def _clean_kotak_description(description: str) -> str:
    """Clean Kotak transaction descriptions."""
    if pd.isna(description):
        return "Unknown Transaction"
    
    desc = str(description).strip()
    
    # Clean UPI transactions
    if "UPI/" in desc:
        parts = desc.split("/")
        if len(parts) >= 2:
            merchant = parts[1]  # Second part is usually merchant
            if merchant:
                return f"UPI - {merchant.title()}"
        return "UPI Payment"
    
    # Clean IMPS transactions
    elif "IMPS/" in desc:
        if "AMAZON" in desc:
            return "IMPS - Amazon"
        return "IMPS Transfer"
    
    # ATM withdrawals
    elif "ATM" in desc:
        return "ATM Cash Withdrawal"
    
    # NEFT salary
    elif "SALARY" in desc and "NEFT" in desc:
        return "Salary Credit"
    
    # Mobile recharge
    elif "MOBILE RECHARGE" in desc:
        return "Mobile Recharge"
    
    return desc[:40] + "..." if len(desc) > 40 else desc

def _clean_axis_description(description: str) -> str:
    """Clean Axis transaction descriptions."""
    if pd.isna(description):
        return "Unknown Transaction"
    
    desc = str(description).strip()
    
    # Clean UPI transactions - Axis format: "UPI-SWIGGY-FOOD DELIVERY-123456789"
    if "UPI-" in desc:
        parts = desc.split("-")
        if len(parts) >= 2:
            merchant = parts[1]  # Second part is merchant
            service = parts[2] if len(parts) > 2 else ""
            if merchant:
                return f"UPI - {merchant.title()}"
        return "UPI Payment"
    
    # NEFT transactions
    elif "NEFT-" in desc:
        if "SALARY" in desc:
            return "Salary Credit"
        return "NEFT Transfer"
    
    # ATM transactions
    elif "ATM-" in desc:
        return "ATM Cash Withdrawal"
    
    return desc[:40] + "..." if len(desc) > 40 else desc

def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to standard names: Date, Description, Category, Amount (case-insensitive)."""
    if df is None or df.empty:
        return df
    mapping = {}
    for col in df.columns:
        lc = str(col).strip().lower()
        if lc in {"date", "transaction date", "posted date", "txn date"}:
            mapping[col] = "Date"
        elif lc in {"description", "details", "merchant", "narration", "memo"}:
            mapping[col] = "Description"
        elif lc in {"category", "cat", "type"}:
            mapping[col] = "Category"
        elif lc in {"amount", "amt", "value", "debit", "credit", "amount (inr)", "amount(rs)", "amount inr", "amount rs"}:
            mapping[col] = "Amount"
    if mapping:
        df = df.rename(columns=mapping)
    # Coerce types if present - but only if not already processed
    if "Amount" in df.columns and df["Amount"].dtype == 'object':
        df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce")
    if "Date" in df.columns and not pd.api.types.is_datetime64_any_dtype(df["Date"]):
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    if "Category" in df.columns:
        df["Category"] = df["Category"].astype(str)
    return df

@app.get("/")
def health():
    return jsonify({"status": "ok", "message": "Backend is running"})


@app.route("/upload", methods=["POST"])
def upload_csv():
    global transactions_df, csv_text
    file = request.files.get("file")
    bank = request.form.get("bank", "").lower()
    
    if file is None:
        return jsonify({"message": "No file provided"}), 400
    
    if not bank:
        return jsonify({"message": "Bank selection required"}), 400
    
    try:
        transactions_df = pd.read_csv(file)
        print(f"Original CSV shape: {transactions_df.shape}, columns: {transactions_df.columns.tolist()}")
        print(f"Processing as {bank.upper()} format")
        
        # Use bank-specific processing
        transactions_df = _normalize_columns_bank_specific(transactions_df, bank)
        print(f"After {bank} normalization: {transactions_df.shape}, columns: {transactions_df.columns.tolist()}")
        
        # Filter out rows with invalid amounts or dates
        if "Amount" in transactions_df.columns:
            transactions_df = transactions_df.dropna(subset=["Amount"])
            # Only remove zero amount transactions if they're clearly invalid
            # (keep them if they might be valid like balance inquiries)
        
        if "Date" in transactions_df.columns:
            transactions_df = transactions_df.dropna(subset=["Date"])
        
        print(f"After filtering: {transactions_df.shape} rows")
        
        # Convert each row to text for LLM context (best-effort if columns present)
        def row_to_text(row):
            date = row["Date"] if "Date" in row and pd.notna(row["Date"]) else "?"
            amount = row["Amount"] if "Amount" in row and pd.notna(row["Amount"]) else "?"
            category = row["Category"] if "Category" in row and pd.notna(row["Category"]) else "?"
            desc = row["Description"] if "Description" in row and pd.notna(row["Description"]) else ""
            return f"On {date} you spent ₹{abs(amount):.2f} on {category}: {desc}"
        
        try:
            csv_text = "\n".join(transactions_df.apply(row_to_text, axis=1))
            print(f"CSV text length: {len(csv_text)} chars")
        except Exception as e:
            print(f"Error creating CSV text: {e}")
            # Fallback to raw CSV text
            csv_text = transactions_df.to_csv(index=False)
        
        print(f"CSV upload successful! Processed {len(transactions_df)} transactions from {bank.upper()} format")
        return jsonify({
            "message": f"CSV uploaded successfully! Processed {len(transactions_df)} {bank.upper()} transactions", 
            "columns": list(transactions_df.columns),
            "bank": bank.upper(),
            "transaction_count": len(transactions_df)
        })
    except Exception as e:
        print(f"CSV upload error: {e}")
        return jsonify({"message": f"Error processing CSV: {str(e)}"}), 400

@app.route("/dashboard", methods=["POST"])
def dashboard():
    global transactions_df
    print(f"Dashboard called. transactions_df is None: {transactions_df is None}")
    if transactions_df is None:
        print("No transactions_df found")
        return jsonify({"error": "No data found. Please upload a CSV first."}), 400
    
    if transactions_df.empty:
        print("transactions_df is empty")
        return jsonify({"error": "No data found. Please upload a CSV first."}), 400
    
    df = transactions_df.copy()
    print(f"DataFrame shape: {df.shape}, columns: {df.columns.tolist()}")
    
    # Calculate dashboard statistics
    dashboard_data = {
        "totalSpending": float(abs(df["Amount"].sum())) if "Amount" in df.columns else 0,
        "totalTransactions": len(df),
        "totalCategories": df["Category"].nunique() if "Category" in df.columns else 0,
        "avgTransaction": float(abs(df["Amount"].mean())) if "Amount" in df.columns else 0,
    }
    
    # Category breakdown
    if "Category" in df.columns and "Amount" in df.columns:
        category_totals = df.groupby("Category")["Amount"].sum().sort_values(ascending=False)
        dashboard_data["categories"] = [
            {"category": cat, "total": float(total)} 
            for cat, total in category_totals.head(10).items()
        ]
    
    # Monthly spending (if Date column exists)
    if "Date" in df.columns and "Amount" in df.columns:
        df["Month"] = df["Date"].dt.strftime("%Y-%m")
        monthly_totals = df.groupby("Month")["Amount"].sum().sort_index()
        dashboard_data["monthly"] = [
            {"month": month, "total": float(total)} 
            for month, total in monthly_totals.items()
        ]
    
    # Top merchants
    if "Description" in df.columns and "Amount" in df.columns:
        merchant_totals = df.groupby("Description")["Amount"].sum().sort_values(ascending=False)
        dashboard_data["topMerchants"] = [
            {"merchant": merchant, "total": float(total)} 
            for merchant, total in merchant_totals.head(8).items()
        ]
    
    return jsonify(dashboard_data)

@app.route("/chat", methods=["POST"])
def chat():
    global csv_text, transactions_df
    if not csv_text or transactions_df is None:
        return jsonify({"response": "Please upload a CSV first."})

    user_query = (request.json or {}).get("query", "")
    # Ensure normalized and typed
    df = transactions_df.copy()

    q = user_query.lower()

    # If AI-only mode, always call Gemini with the CSV context
    if ANSWER_MODE == "ai-only":
        if not GEMINI_API_KEY:
            return jsonify({
                "response": (
                    "AI is not configured yet. Add GEMINI_API_KEY in backend/.env to enable AI answers.\n"
                    "Meanwhile, try: 'What is my total spending?', 'How much on Food?', 'Show my highest transaction', or 'How much in September 2025?'."
                ),
                "needs_key": True,
                "meta": {"mode": "ai-only", "rule": "no-llm"},
            })

        # Optionally trim context to avoid overlong prompts
        context_text = csv_text
        truncated = False
        if len(context_text) > CSV_CONTEXT_MAX_CHARS:
            context_text = context_text[-CSV_CONTEXT_MAX_CHARS:]
            truncated = True

        helper = _summaries_for_llm(df) if _savings_intent(user_query) else ""
        prompt = f"""
You are a personal finance chat agent. Always reply in 2-3 short, plain sentences, spaced like a real chat. Never use Markdown, never use bullet points, never use headings, never use lists, never use bold or italics. Do not summarize categories or give long explanations.

IMPORTANT: All amounts are in Indian Rupees (INR). Always mention amounts with "Rs" or "₹" symbol, never use dollars ($).

When asked about saving money or useless spending, do this:
For each suggestion, mention the merchant/item, the amount spent in Rs, and if it is above the category median, say how much percent higher (e.g., 'You spent Rs 350 on Starbucks, which is 40% higher than your Food median. You can cut this habit.').
Give a concrete, actionable suggestion for each, like 'You can save by switching to regular coffee.'
If there is nothing to cut, say 'Your spending looks reasonable.'

Data (one line per transaction){' [TRUNCATED]' if truncated else ''}:

{context_text}

{'Helper summaries:\n' + helper if helper else ''}

Question:
{user_query}
"""

        try:
            # Add a system message to enforce style
            system_prompt = (
                "You are a helpful, concise personal finance chat agent. Reply in 2-3 short, plain sentences, spaced like a real chat. Never use Markdown, never use bullet points, never use headings, never use lists, never use bold or italics. No long answers. IMPORTANT: All amounts are in Indian Rupees (INR) - always use Rs or ₹ symbol, never dollars ($)."
            )
            full_prompt = system_prompt + "\n\n" + prompt
            answer, meta = _llm_chat(full_prompt)
            # Post-process: remove Markdown, lists, and enforce chat-style spacing
            import re
            def clean_answer(text):
                # Remove Markdown bold/italic, bullets, and numbers
                text = re.sub(r"\*\*([^*]+)\*\*", r"\\1", text)
                text = re.sub(r"\*([^*]+)\*", r"\\1", text)
                text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)
                text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
                # Remove extra newlines, keep max 2 in a row
                text = re.sub(r"\n{3,}", "\n\n", text)
                # Add a space after every sentence for chat feel
                text = re.sub(r"([.!?])([^ \n])", r"\1 \2", text)
                # Remove leading/trailing whitespace
                return text.strip()
            answer = clean_answer(answer)
        except Exception as e:
            # Fallback to local suggestions for savings intent
            if _savings_intent(user_query):
                answer = _local_savings_suggestions(df)
                meta = {"error": True, "fallback": "local-savings"}
            else:
                answer = f"LLM error: {e}."
                meta = {"error": True}

        return jsonify({"response": answer, "meta": {"mode": "ai-only", "rule": "llm", **meta}})

    # HYBRID mode below: rule-based shortcuts first, then LLM
    # 1) Total spending
    if "total" in q and "Amount" in df.columns:
        total = df["Amount"].dropna().sum()
        return jsonify({"response": f"Your total spending is {total:.2f}.", "meta": {"rule": "total"}})

    # 2) Highest / Lowest transaction
    if "highest" in q or "largest" in q or "max" in q:
        if "Amount" in df.columns and not df["Amount"].dropna().empty:
            idx = df["Amount"].idxmax()
            row = df.loc[idx]
            return jsonify({"response": f"Highest transaction is {row['Amount']:.2f} on {row.get('Date', '')} for {row.get('Category', '')}: {row.get('Description', '')}", "meta": {"rule": "highest"}})
    if "lowest" in q or "smallest" in q or "min" in q:
        if "Amount" in df.columns and not df["Amount"].dropna().empty:
            idx = df["Amount"].idxmin()
            row = df.loc[idx]
            return jsonify({"response": f"Lowest transaction is {row['Amount']:.2f} on {row.get('Date', '')} for {row.get('Category', '')}: {row.get('Description', '')}", "meta": {"rule": "lowest"}})

    # 3) Spending by category, e.g., "on Food" or "category Food"
    import re
    cat_match = re.search(r"(?:on|category)\s+([\w &-]+)", q)
    if cat_match and "Category" in df.columns and "Amount" in df.columns:
        cat = cat_match.group(1).strip().lower()
        mask = df["Category"].str.lower() == cat
        amount = df.loc[mask, "Amount"].dropna().sum()
    return jsonify({"response": f"You spent {amount:.2f} on {cat}.", "meta": {"rule": "category", "category": cat}})

    # 4) Monthly spending: detect month name and optional year
    months = ["january","february","march","april","may","june","july","august","september","october","november","december"]
    month_idx = next((i+1 for i,m in enumerate(months) if m in q), None)
    year_match = re.search(r"(20\d{2})", q)
    if month_idx and "Date" in df.columns and "Amount" in df.columns:
        mask = df["Date"].dt.month == month_idx
        year = None
        if year_match:
            year = int(year_match.group(1))
            mask = mask & (df["Date"].dt.year == year)
        amount = df.loc[mask, "Amount"].dropna().sum()
        month_name = months[month_idx-1].capitalize()
        suffix = f" {year}" if year else ""
    return jsonify({"response": f"You spent {amount:.2f} in {month_name}{suffix}.", "meta": {"rule": "month", "month": month_name, "year": year}})

    # 5) Category in a given month (e.g., "Food in September 2025")
    if "Category" in df.columns and "Amount" in df.columns and "Date" in df.columns:
        cat_match2 = re.search(r"(?:on|category)\s+([\w &-]+)", q)
        if cat_match2 or any(m in q for m in months):
            cat = cat_match2.group(1).strip().lower() if cat_match2 else None
            m_idx = next((i+1 for i,m in enumerate(months) if m in q), None)
            yr_match = re.search(r"(20\d{2})", q)
            mask = df["Amount"].notna()
            if cat:
                mask = mask & (df["Category"].str.lower() == cat)
            if m_idx:
                mask = mask & (df["Date"].dt.month == m_idx)
            if yr_match:
                mask = mask & (df["Date"].dt.year == int(yr_match.group(1)))
            amount = df.loc[mask, "Amount"].dropna().sum()
            parts = []
            if cat:
                parts.append(f"on {cat}")
            if m_idx:
                parts.append(months[m_idx-1].capitalize())
            if yr_match:
                parts.append(yr_match.group(1))
            scope = " in " + " ".join(parts) if parts else ""
            return jsonify({"response": f"You spent {amount:.2f}{scope}.", "meta": {"rule": "category+month", "category": cat, "month": months[m_idx-1].capitalize() if m_idx else None, "year": yr_match.group(1) if yr_match else None}})

    prompt = f"""
You are an AI personal finance assistant.
Here is the user's bank data (one per line):

{csv_text}

Answer the following question based on this data:
{user_query}
"""

    if not GEMINI_API_KEY:
        # Friendly 200 response so the frontend can show it in chat without error handling
        return jsonify({
            "response": (
                "AI is not configured yet. Add GEMINI_API_KEY in backend/.env to enable AI answers.\n"
                "Meanwhile, try: 'What is my total spending?', 'How much on Food?', 'Show my highest transaction', or 'How much in September 2025?'."
            ),
            "needs_key": True,
            "meta": {"rule": "no-llm"},
        })

    try:
        answer, meta = _llm_chat(prompt)
    except Exception as e:
        answer = f"LLM error: {e}. Try asking for 'total' to use a local calculation."
        meta = {"error": True}

    return jsonify({"response": answer, "meta": {"mode": "hybrid", "rule": "llm", **meta}})


@app.route("/advanced-analytics", methods=["POST"])
def advanced_analytics():
    """Advanced data science analytics endpoint with statistical analysis."""
    global transactions_df
    
    if transactions_df is None or transactions_df.empty:
        return jsonify({"error": "No data found. Please upload a CSV first."}), 400
    
    df = transactions_df.copy()
    
    # Initialize analytics data
    analytics_data = {}
    
    # 1. Statistical Summary
    if "Amount" in df.columns:
        amounts = df["Amount"].abs()  # Use absolute values for stats
        analytics_data["statistics"] = {
            "mean": float(amounts.mean()),
            "median": float(amounts.median()),
            "std": float(amounts.std()),
            "min": float(amounts.min()),
            "max": float(amounts.max()),
            "count": int(amounts.count()),
            "q25": float(amounts.quantile(0.25)),
            "q75": float(amounts.quantile(0.75))
        }
    
    # 2. Outlier Detection using IQR method
    outliers = []
    if "Amount" in df.columns:
        amounts = df["Amount"].abs()
        Q1 = amounts.quantile(0.25)
        Q3 = amounts.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        
        outlier_mask = (amounts < lower_bound) | (amounts > upper_bound)
        outlier_df = df[outlier_mask].copy()
        
        for _, row in outlier_df.head(10).iterrows():
            outliers.append({
                "amount": float(row.get("Amount", 0)),
                "description": str(row.get("Description", "Unknown")),
                "category": str(row.get("Category", "Unknown")),
                "date": str(row.get("Date", "Unknown"))
            })
    
    analytics_data["outliers"] = outliers
    
    # 3. Category Trends - Average and Median by Category
    category_trends = []
    if "Category" in df.columns and "Amount" in df.columns:
        cat_stats = df.groupby("Category")["Amount"].agg([
            ('avg', lambda x: abs(x).mean()),
            ('median', lambda x: abs(x).median()),
            ('total', lambda x: abs(x).sum()),
            ('count', 'count')
        ]).sort_values('total', ascending=False)
        
        for cat, row in cat_stats.head(8).iterrows():
            category_trends.append({
                "category": str(cat),
                "avg": float(row['avg']),
                "median": float(row['median']),
                "total": float(row['total']),
                "count": int(row['count'])
            })
    
    analytics_data["categoryTrends"] = category_trends
    
    # 4. Spending by Day of Week
    weekday_spending = [0] * 7
    if "Date" in df.columns and "Amount" in df.columns:
        df["DayOfWeek"] = pd.to_datetime(df["Date"]).dt.dayofweek
        weekday_totals = df.groupby("DayOfWeek")["Amount"].apply(lambda x: abs(x).sum())
        for day, total in weekday_totals.items():
            if 0 <= day < 7:
                weekday_spending[day] = float(total)
    
    analytics_data["weekdaySpending"] = weekday_spending
    
    # 5. Spending by Hour of Day (if time information is available)
    hourly_spending = [0] * 24
    if "Date" in df.columns and "Amount" in df.columns:
        try:
            df["Hour"] = pd.to_datetime(df["Date"]).dt.hour
            hourly_totals = df.groupby("Hour")["Amount"].apply(lambda x: abs(x).sum())
            for hour, total in hourly_totals.items():
                if 0 <= hour < 24:
                    hourly_spending[hour] = float(total)
        except:
            # If no time information, distribute spending across business hours (9-21)
            if "Amount" in df.columns:
                avg_per_hour = abs(df["Amount"]).sum() / 13  # 13 business hours
                for hour in range(9, 22):
                    hourly_spending[hour] = float(avg_per_hour)
    
    analytics_data["hourlySpending"] = hourly_spending
    
    # 6. Frequent Merchants
    frequent_merchants = []
    if "Description" in df.columns and "Amount" in df.columns:
        merchant_stats = df.groupby("Description").agg({
            "Amount": [('total', lambda x: abs(x).sum()), 
                       ('avg', lambda x: abs(x).mean()), 
                       ('count', 'count')]
        })
        merchant_stats.columns = ['total', 'avg', 'count']
        merchant_stats = merchant_stats.sort_values('count', ascending=False)
        
        for merchant, row in merchant_stats.head(8).iterrows():
            frequent_merchants.append({
                "merchant": str(merchant),
                "total": float(row['total']),
                "avg": float(row['avg']),
                "count": int(row['count'])
            })
    
    analytics_data["frequentMerchants"] = frequent_merchants
    
    # 7. Data Quality Metrics
    total_records = len(df)
    missing_values = df.isnull().sum().sum()
    duplicates = df.duplicated().sum()
    completeness = ((total_records * len(df.columns) - missing_values) / 
                    (total_records * len(df.columns)) * 100) if total_records > 0 else 100
    
    analytics_data["dataQuality"] = {
        "total": total_records,
        "missing": int(missing_values),
        "duplicates": int(duplicates),
        "completeness": round(float(completeness), 2)
    }
    
    # 8. Generate Insights
    insights = []
    
    # Insight 1: Highest spending category
    if category_trends:
        top_cat = category_trends[0]
        insights.append({
            "icon": "📊",
            "title": "Top Spending Category",
            "text": f"You spent the most on {top_cat['category']} with ₹{top_cat['total']:.2f} across {top_cat['count']} transactions."
        })
    
    # Insight 2: Most expensive transaction
    if "Amount" in df.columns:
        max_transaction = abs(df["Amount"]).max()
        insights.append({
            "icon": "💰",
            "title": "Largest Transaction",
            "text": f"Your largest single transaction was ₹{max_transaction:.2f}. Review large purchases to identify savings opportunities."
        })
    
    # Insight 3: Spending pattern by day
    if weekday_spending:
        max_day_idx = weekday_spending.index(max(weekday_spending))
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        insights.append({
            "icon": "📅",
            "title": "Peak Spending Day",
            "text": f"You spend the most on {days[max_day_idx]} (₹{weekday_spending[max_day_idx]:.2f}). Consider budgeting extra for this day."
        })
    
    # Insight 4: Frequent merchant
    if frequent_merchants:
        top_merchant = frequent_merchants[0]
        insights.append({
            "icon": "🏪",
            "title": "Most Frequent Merchant",
            "text": f"You transact most often with {top_merchant['merchant']} ({top_merchant['count']} times), spending ₹{top_merchant['total']:.2f} in total."
        })
    
    # Insight 5: Spending consistency
    if "Amount" in df.columns:
        cv = (analytics_data["statistics"]["std"] / analytics_data["statistics"]["mean"]) * 100
        consistency = "very consistent" if cv < 50 else "moderately consistent" if cv < 100 else "highly variable"
        insights.append({
            "icon": "📈",
            "title": "Spending Consistency",
            "text": f"Your spending is {consistency} with a coefficient of variation of {cv:.1f}%. {'This is good!' if cv < 50 else 'Try to maintain consistent spending habits.'}"
        })
    
    # Insight 6: Data quality
    if analytics_data["dataQuality"]["completeness"] >= 95:
        insights.append({
            "icon": "✅",
            "title": "Data Quality",
            "text": f"Your financial data is {analytics_data['dataQuality']['completeness']:.1f}% complete with only {analytics_data['dataQuality']['missing']} missing values. Excellent data quality!"
        })
    else:
        insights.append({
            "icon": "⚠️",
            "title": "Data Quality Warning",
            "text": f"Your data has {analytics_data['dataQuality']['missing']} missing values ({analytics_data['dataQuality']['completeness']:.1f}% complete). Consider data cleanup for better insights."
        })
    
    analytics_data["insights"] = insights
    
    return jsonify(analytics_data)

@app.route("/test-categorization", methods=["GET"])
def test_categorization():
    """Test endpoint to verify categorization is working"""
    test_descriptions = [
        "UPI/INDIAN CLEARING/Sent using Paytm",
        "IMPS/UPSTOXSECURITIES",
        "UPI/NETFLIX.COM/Monthly autorenew",
        "UPI/Flipkart/Purchase",
        "UPI/CRED CASHBACK EARNED"
    ]
    results = {}
    for desc in test_descriptions:
        category = _categorize_kotak_transaction(desc)
        results[desc] = category
    return jsonify({
        "message": "Categorization test",
        "results": results
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    url = f"http://0.0.0.0:{port}"
    print(f"Starting Flask server at {url}")
    # Use gunicorn in production, simple server for development
    app.run(host="0.0.0.0", port=port, debug=False)
