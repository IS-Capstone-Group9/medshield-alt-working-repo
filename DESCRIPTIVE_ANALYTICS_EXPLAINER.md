# MedShield Descriptive Analytics: Business Explainer

This document explains how the MedShield descriptive analytics pipeline works in plain, simple business terms. It answers the question: **"How does the system clean, sort, and analyze our historical sales data?"**

---

## 1. The Quality Check (Data Cleaning)
Before we look at any numbers, we have to make sure they are accurate. Think of this step as a digital gatekeeper:
* **No Missing Dates**: If a sales record doesn't show when it was delivered, we discard it.
* **No Rejections**: If a record was flagged as "rejected" during quality control, it is thrown out.
* **Clean Transactions Only**: We filter out double-billings, adjustments, and test data. We only keep records officially marked as "accepted clean sales."

---

## 2. The Sorting Bins (Product & Area Groupings)
To make sense of the data, we organize it into clear buckets:

### A. Location Buckets (Where did it sell?)
We sort locations into three separate types:
1. **Territories (Physical Regions)**: True geographic places like *Batangas*, *Cavite*, or *Laguna*. (These are the only regions where weather affects demand).
2. **Customer Channels (Who bought it?)**: Categories of clients like *Government*, *Hospitals*, or *Pharmacies*.
3. **Internal Accounts**: Internal categories like *Admin*, *Personal*, or *Losses*. (We exclude these from forecasting so they don't mess up our actual customer demand numbers).

### B. Product Buckets (What sold?)
We split products into two major streams:
* **Medicines & Medical Supplies**: The actual pharmaceutical inventory we care about (like *Antizoal* or *Paracetamol*).
* **Non-Medical Items**: Operational overhead (like *ballpens*, *folders*, or *promotional t-shirts*).
* *Why separate them?* We don't want office supplies or t-shirt purchases to dilute or skew the priority of life-saving medicines.

---

## 3. The 80/20 Rule (ABC Prioritization)
Not all products contribute equally to MedShield's business. We use the Pareto Principle (the 80/20 rule) to rank products from highest to lowest revenue:
* **Class A (High Priority)**: The top-tier products that make up **80% of our total revenue**. These are our most critical items that we must never run out of.
* **Class B (Medium Priority)**: The middle-tier products making up the next **15% of revenue**.
* **Class C (Low Priority)**: The long-tail products that make up the final **5% of revenue** (slow-movers or low-value items).

---

## 4. The Monthly Wave (Seasonality Index)
We want to know which months typically experience sales surges (e.g., flu season or rainy months):
1. **The Benchmark**: We calculate our average monthly sales volume over a 5-year period.
2. **The Multiplier**: We compare each calendar month to that benchmark.
   * If **May** has a score of **1.20**, it means sales in May are typically **20% higher** than our average month.
   * If **September** has a score of **0.80**, sales are typically **20% lower** than average.
   * **Seasonal Strength**: Tells us how extreme our peaks and troughs are. A high strength score means the business is highly seasonal (like seasonal flu medicines).

---

## 5. Year-over-Year (YoY) Growth (How are we growing?)
To see if the business is expanding or contracting, we compare months to the exact same period in the prior year:
* Instead of comparing May to April (which changes because of seasonal weather), we compare **May 2024 to May 2023**.
* This isolates true year-over-year growth, showing whether a demand spike is a permanent business growth trend or just a seasonal anomaly.
