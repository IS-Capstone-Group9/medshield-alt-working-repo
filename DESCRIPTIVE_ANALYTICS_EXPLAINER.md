# MedShield Descriptive Analytics: Business Explainer

This document connects the descriptive analytics code logic directly to the **MedShield North Star Diagram** nodes. It explains in plain business terms how the system answers the primary descriptive questions to support our ultimate goal: **optimizing inventory and reducing losses**.

---

## Strategic Objective: The North Star Question
> **How can MedShield optimize its inventory and reduce losses?**
> Before we can predict future demand (Predictive Path) or recommend order quantities (Prescriptive Path), we must understand what happened in our historical sales. The descriptive path is the analytical foundation for this.

---

## 1. The Quality Gatekeeper (Data Preparation)
Before any calculations begin, the data is screened for accuracy:
* **Invalid Records Filtered**: Sales records with missing delivery dates are ignored.
* **Bad Status Filtered**: Transactions marked as "rejected" or missing the "accepted clean sales" status are excluded to prevent errors (like duplicate invoices) from distorting the overall analysis.

---

## 2. Mapping the Business (North Star Node 2A)
> **Question 2A**: *How are products, territories, and customers grouped by behavior?*
> **Method**: *Area + industry rule-based encoding*

The code standardizes raw entries into organized business groupings:
* **Territory vs. Channel Grouping**: We group locations into actual physical **Territories** (e.g. *Batangas*, *Laguna*) separately from **Customer Channels** (e.g. *Government*, *Hospital*) and **Internal Business Lines** (e.g. *Admin*, *Losses*).
* **Product Classification (Medicine vs. Overhead)**: We check products against the product master list. If unmapped, the system uses rules to separate actual medicines from operational overhead (like *ballpens* or *folders*). This ensures stationery purchases do not skew our critical medicine inventory statistics.

---

## 3. The Seasonal Demand Cycle (North Star Node 3A)
> **Question 3A**: *What seasonal demand cycles exist in 2021-2025 sales data?*
> **Method**: *Seasonal index calculation*

We identify when demand spikes occur throughout the year (e.g., during rainy seasons or bidding cycles):
* **The Multiplier**: We calculate the average sales volume across all months as a baseline. Then, we compare each individual month to this baseline.
* **Interpretation**:
  * A score of **1.20** means that month typically sees **20% more demand** than average (Peak Season).
  * A score of **0.80** means the month typically experiences **20% less demand** (Trough Season).
* **Seasonal Strength**: Measures the gap between our highest peak and lowest trough. A higher score indicates a highly volatile seasonal product.

---

## 4. Revenue Contribution (North Star Node 4A)
> **Question 4A**: *What are the current revenue contributions across products, territories, and account types?*
> **Method**: *80/20 ranking*

We identify which products represent our most critical financial and operational priorities:
* **The Sort**: We rank products descending by total sales revenue.
* **The Categories**:
  * **Class A**: The vital few products generating the top **80%** of total revenue.
  * **Class B**: The middle-tier generating the next **15%** of revenue.
  * **Class C**: The long-tail generating the final **5%** of revenue.

---

## 5. Year-over-Year Growth Trends (North Star Node 5A)
> **Question 5A**: *What are YoY growth trends across entry, territory, and account-type levels?*
> **Method**: *Time-series trend analysis*

We isolate long-term business growth from seasonal fluctuations:
* **Matching Comparison**: We compare a month’s revenue and quantity directly to the same calendar month of the prior year (e.g., comparing **May 2024 to May 2023**).
* **The Value**: This tells us if demand is growing year-over-year, avoiding false spikes that are simply due to recurring seasonal weather.

---

## 6. Territory Performance (North Star Node 6A)
> **Question 6A**: *Which service territories generate the most revenue and net income?*
> **Method**: *Geographic revenue ranking*

We isolate and rank geographic territories to identify where demand is physically concentrated:
* **Location Filtering**: We filter out non-geographic labels (like administrative lines or losses).
* **Financial Rank**: We sort the remaining actual geographic territories by revenue and gross margin to highlight the regions that contribute most to sales and profitability.

---

## 7. Customer Concentration (North Star Node 7A)
> **Question 7A**: *Who are the high-value institutional clients driving 80% of total revenue?*
> **Method**: *Customer concentration ranking*

We isolate our largest sales channels to support strategic allocation decisions:
* **Channel Segregation**: We rank the primary buyer types (*Government*, *Hospital*, *Pharma*) by total sales volume.
* **The Insight**: This reveals which institutional customer type is driving the bulk of sales, allowing planners to prioritize government bidding cycles and hospital contracts accordingly.
