from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()  # load environment variables from .env

app = Flask(__name__)
# Allow requests from Vite dev server and production frontend
CORS(app, origins=[
    "http://localhost:5173",  # Local development
    "https://*.vercel.app",   # Vercel deployment
    "https://your-app-name.vercel.app"  # Replace with your actual Vercel URL
])

# Configure Gemini directly
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
# Answer mode: "ai-only" (default) always uses Gemini; "hybrid" tries rules then falls back to Gemini
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
    # Coerce types if present
    if "Amount" in df.columns:
        df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce")
    if "Date" in df.columns:
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
    if file is None:
        return jsonify({"message": "No file provided"}), 400
    
    try:
        transactions_df = pd.read_csv(file)
        print(f"Original CSV shape: {transactions_df.shape}, columns: {transactions_df.columns.tolist()}")
        transactions_df = _normalize_columns(transactions_df)
        print(f"After normalization: {transactions_df.shape}, columns: {transactions_df.columns.tolist()}")
        
        # Convert each row to text for LLM context (best-effort if columns present)
        def row_to_text(row):
            date = row["Date"] if "Date" in row and pd.notna(row["Date"]) else "?"
            amount = row["Amount"] if "Amount" in row and pd.notna(row["Amount"]) else "?"
            category = row["Category"] if "Category" in row and pd.notna(row["Category"]) else "?"
            desc = row["Description"] if "Description" in row and pd.notna(row["Description"]) else ""
            return f"On {date} you spent {amount} on {category}: {desc}"
        
        try:
            csv_text = "\n".join(transactions_df.apply(row_to_text, axis=1))
            print(f"CSV text length: {len(csv_text)} chars")
        except Exception as e:
            print(f"Error creating CSV text: {e}")
            # Fallback to raw CSV text
            csv_text = transactions_df.to_csv(index=False)
        
        print("CSV upload successful!")
        return jsonify({"message": "CSV uploaded successfully!", "columns": list(transactions_df.columns)})
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
    
    df = _normalize_columns(transactions_df.copy())
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
    df = _normalize_columns(transactions_df.copy())

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    url = f"http://0.0.0.0:{port}"
    print(f"Starting Flask server at {url}")
    # Use gunicorn in production, simple server for development
    app.run(host="0.0.0.0", port=port, debug=False)
