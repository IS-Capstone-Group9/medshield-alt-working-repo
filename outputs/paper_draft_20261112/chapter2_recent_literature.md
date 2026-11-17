# Chapter 2 supplement: recent literature (2021–2026)

Draft for insertion into Chapter 2 as a new Section 2.5, after 2.4 and before the synthesis (PDF pages 67–68). The
existing "2.5 Synthesis and research gap" becomes 2.6, and the paragraphs under 2.6 below are added to it. Table 2.x
keeps a placeholder number: set it to the next free Chapter 2 table number in the main paper. Every source below was checked on
14 November 2026 against the publisher page, PubMed Central, Europe PMC or Crossref metadata (title, authors, journal,
year, DOI). Findings are paraphrased from abstracts and full texts where accessible; quote page numbers from the final
PDFs before submission. APA 7th edition.

## 2.5 Climate, disease and pharmaceutical demand

### 2.5.1 Climate and disease in the Philippines

Climate is an established driver of several infectious diseases in the Philippines. A scoping review of 69 Philippine
climate-health studies published from 2018 to 2023 found that dengue, the most studied disease, was associated with
rainfall, humidity and temperature, that leptospirosis increased with heavy rainfall and flooding, and that diarrhoea
and other enteric infections rose with high temperatures, especially among children under five (De Guzman et al.,
2025). The same review reported links between heat and non-communicable conditions, including cardiovascular disease,
chronic kidney disease and hypertension.

For dengue, the evidence is strongest for temperature. Using weekly provincial dengue cases from 2010 to 2019, Seposo
et al. (2024) attributed 72.1% of reported cases to temperature, with the largest attributable share in epidemiological
weeks 15 to 24, the warm-dry season. A causal analysis across 16 Philippine climatic regions confirmed that temperature
consistently increased dengue incidence, but found that rainfall's effect depended on the local dry-season pattern: it
reduced incidence where dry-season length varied little and increased it where it varied greatly (Cawiding et al.,
2025). Climate effects on disease are therefore real but regional and lagged, not uniform.

Rainfall and flooding drive water- and rodent-borne diseases. In a 2022–2023 Philippine case study, dengue,
leptospirosis and typhoid cases were significantly higher during monsoon weeks than outside them (Tan et al., 2025).
Leptospirosis cases rose 43.4% from January to July 2025 compared with the same period in 2024, with outbreaks
consistently following intense rainfall and flooding (Interior et al., 2025).

### 2.5.2 Disease and medicine use

If disease drives demand, medicine sales should follow disease activity. Over-the-counter drug sales have been shown to
anticipate influenza-like illness and respiratory hospitalisation surges across 510 Brazilian regions from 2022 to 2025
(Oliveira et al., 2026). Within hospitals, climate also affects prescribing: in a southern Thai tertiary hospital,
7,696 antibiotic prescriptions from 2021 to 2023 responded to weather differently by class: beta-lactam use rose within
about two biweeks of warming and with heavier rainfall, while tetracycline and macrolide use rose after sudden
temperature drops (Pannoi et al., 2026). The study covers a single hospital and reports little seasonality for
tetracyclines. In retail pharmacy data, sales grouped by ATC therapeutic class show clear seasonal patterns
(Fourkiotis & Tsadiras, 2024).

### 2.5.3 Forecasting and classifying pharmaceutical demand

Machine learning can improve pharmaceutical demand forecasts, but its advantage over simple methods is often small.
Fourkiotis and Tsadiras (2024) found XGBoost performed best on about 600,000 single-pharmacy sales records grouped by ATC
class. In a Beijing tertiary hospital, a LightGBM-Tweedie model outperformed a naive last-week forecast by only 2.2
percentage points of weighted MAPE for smooth-demand drugs and 0.9 points for erratic-demand drugs on 2024 test data (Liu
et al., 2026). Simple benchmarks therefore remain essential reference points.

For inventory classification, combining value (ABC) with demand variability (XYZ) remains effective in hospital
settings. In a public tertiary cancer hospital in northern India, an ABC–XYZ intervention covering 286 medicines reduced
average monthly stock-outs by 88.5% (p < 0.001) during a six-month 2024 pilot, while a 76.5% reduction in wastage cost
was not statistically significant (Singh et al., 2026).

### 2.5.4 Public procurement of medicines in the Philippines

The Philippine government is a large and growing buyer of medicines. Direct public procurement more than doubled from
PhP 7.8 billion in 2014 to PhP 20.1 billion in 2019; among almost 50,000 procurement records in 2019, about a third of
posted opportunities lacked descriptions sufficient for purchase, and mandated price caps were associated with longer
posting periods and more failed procurements (Abrigo et al., 2021). Institutional demand is thus shaped by procurement
rules, budgets and tender timing, not only by patient need.

### 2.5.5 Disease burden and the Philippine medicine market

Both chronic and infectious diseases shape medicine demand in the Philippines. Of 694,821 registered deaths in 2023, ischaemic heart diseases caused
18.6%, neoplasms 10.7% and cerebrovascular diseases 10.0%, while pneumonia, an infectious disease,
ranked fourth at 6.3% (Philippine Statistics Authority [PSA], 2025). Households carry much of the cost: out-of-pocket
payments were 44.4% of current health expenditure in 2023 (PSA, 2024), and about half of household health spending
goes to medicines (Reyes & Tabuga, 2020).

The national market is mainly a retail market. Of PhP 173.1 billion in pharmaceutical sales in 2016, 87.2% went through
retail outlets such as drugstores and only 12.8% through hospitals (Reyes & Tabuga, 2020). Prescription ("ethical")
products account for about 70% of market value, with over-the-counter products making up the rest (Magno, 2022). Policy
has aimed at affordability: the Generics Act of 1988 required generic names in prescribing and dispensing, the
Universally Accessible Cheaper and Quality Medicines Act of 2008 allowed price regulation, and the CREATE Act of 2021
exempted prescription medicines from value-added tax: those for diabetes, high cholesterol and hypertension from
January 2020, and those for cancer, mental illness, tuberculosis and kidney diseases from January 2021 (Section 12).

The institutional channel works differently. Government hospitals largely buy branded generics (78%), and multinational
firms supplied 79% of government-procured medicines in 2016 (Magno, 2022). Public buyers purchase through competitive
bidding under the Government Procurement Reform Act of 2003, replaced in 2024 by the New Government Procurement Act.
Some demand is created by programmes rather than by current illness: the Anti-Rabies Act of 2007 makes the Department of
Health responsible for keeping rabies vaccine available in animal bite treatment centres, and in Albay Province attendance at animal bite treatment centres "reflected availability
of PEP and proximity to ABTCs rather than rabies incidence" (Rysava et al., 2022).

Seasons provide the expected timing of infectious disease. PAGASA (n.d.) describes a rainy season from June to November
and a dry season from December to May, divided into a cool dry season (December to February) and a hot dry season
(March to May). The disease studies in Section 2.5.1 place dengue, leptospirosis and typhoid peaks in the rainy season.

### 2.5.6 Basis for classifying products

Products can be grouped by what they treat using the WHO Anatomical Therapeutic Chemical (ATC) classification, which
has five levels from the anatomical main group (14 groups) down to the chemical substance (WHO Collaborating Centre for
Drug Statistics Methodology, n.d.). This study maps product families to therapeutic categories aligned with ATC groups
(for example J01 antibacterials, J07 vaccines, B01 antithrombotics) and classifies them by value and demand variability
with ABC–XYZ (Singh et al., 2026). A common design assumption follows from Sections 2.5.1 to 2.5.5: chronic-disease
medicines should sell steadily all year, while infection medicines should surge with the rainy season. Table 2.x states
these expectations so that Chapter 4 can test them against MedShield's records.

**Table 2.x. What the literature leads one to expect, and what Chapter 4 tests**

| Expectation from the literature | Source | Tested in |
|---|---|---|
| Most medicine sales go through drugstores (87.2%); prescription products are about 70% of value | Reyes & Tabuga (2020); Magno (2022) | 4.2, 4.6.1: MedShield's buyer and category mix |
| Chronic-disease medicines form a large, steady base | PSA (2025) | 4.6.1: share of chronic-disease categories |
| Infection medicines rise in the rainy season, June to November | PAGASA (n.d.); Tan et al. (2025) | 4.6.1: seasonality of each category |
| Disease activity moves medicine sales within weeks | Oliveira et al. (2026) | 4.6.1: disease cases against category sales |
| Steady, high-value items suit automatic reordering | Singh et al. (2026) | 4.5: family ABC–XYZ |

## 2.6 Synthesis and research gap (additions)

The literature supports a chain from climate to disease to medicine demand: climate drives dengue, leptospirosis,
typhoid and enteric disease in the Philippines (Cawiding et al., 2025; De Guzman et al., 2025; Seposo et al., 2024; Tan
et al., 2025), and disease activity moves medicine use in retail and hospital settings (Oliveira et al., 2026; Pannoi et
al., 2026). This justifies collecting DOH disease and PAGASA/NASA POWER weather data and testing whether they explain
sales.

Two gaps remain. First, the disease-to-demand evidence comes from retail pharmacy sales or single-hospital dispensing,
where purchases follow patients closely, and the Philippine market itself is 87.2% retail (Reyes & Tabuga, 2020). No
study found for 2021–2026 examines whether the link holds for a distributor in the smaller institutional channel,
selling mainly to government offices and hospitals, whose purchases follow procurement rules and programmes (Abrigo et
al., 2021; Magno, 2022; Rysava et al., 2022).
Second, published accuracy gains of machine learning over simple benchmarks are often small (Liu et al., 2026), so a
distributor with limited history needs evaluation designs that compare every model against a simple reference. This
study addresses both gaps: it tests the climate–disease–demand link at brand, family and therapeutic-category level for
an institutional distributor, and it evaluates every forecasting model against a simple benchmark under pre-registered
rules.

## References

Abrigo, M. R. M., Opiniano, G. A., Tam, Z. C., Yee, S. A., & Estopace, K. M. M. (2021). *Public sector procurement of
medicines in the Philippines* (PIDS Discussion Paper Series No. 2021-44). Philippine Institute for Development Studies.
https://pidswebs.pids.gov.ph/CDN/PUBLICATIONS/pidsdps2144.pdf

Cawiding, O. R., Jeon, S., Tubera-Panes, D., de los Reyes, A. A., V, & Kim, J. K. (2025). Disentangling climate's dual
role in dengue dynamics: A multiregion causal analysis study. *Science Advances, 11*(7), eadq1901.
https://doi.org/10.1126/sciadv.adq1901

De Guzman, C., Cabaero, M. L., Lo, J. R., Loro, J., Crisostomo, M. V., Ylade, M., & Agrupis, K. A. (2025). Recent trends
in research on the health impacts of climate change in the Philippines (2018–2023): A scoping review. *Frontiers in
Climate, 7*, 1594793. https://doi.org/10.3389/fclim.2025.1594793

Fourkiotis, K. P., & Tsadiras, A. (2024). Applying machine learning and statistical forecasting methods for enhancing
pharmaceutical sales predictions. *Forecasting, 6*(1), 170–186. https://doi.org/10.3390/forecast6010010

Interior, J. S., Bigay-Iringan, K. J. J., Bondad-Delson, R. N. D., Iringan, R. A. A., Calderon, X. M. S., & Castro, A. G.
P. (2025). Leptospirosis in the Philippines: Confronting the structural roots of a recurring threat. *Pathogens, 14*(10),
963. https://doi.org/10.3390/pathogens14100963

Liu, Y., Zhou, M., Yu, J., An, Y., Nie, G., Ji, Z., & Wang, L. (2026). Optimising hospital pharmacy inventory for
high-value, intermittent-demand drugs using a machine-learning approach with LightGBM-Tweedie regression: A
single-centre, retrospective study. *BMJ Open, 16*(10), e119366. https://doi.org/10.1136/bmjopen-2026-119366

Magno, C. (2022). *Pharmaceutical competition in the Philippines* (PCC Discussion Paper No. 01, Series of 2022).
Philippine Competition Commission.
https://www.phcc.gov.ph/storage/pdf-resources/1673487756_DP-2022-01-Pharmaceutical-Competition-in-the-Philippines.pdf

Oliveira, J. F., Cerqueira-Silva, T., Brito, P. A. N., da Silva, N. B., Fiaconne, R. L., Cunha, M. C. S. L., Cunha, G.
G., Miranda, R. B., Dias, L. M., Filho, F. M. H. S., Penna, G. O., Ramos, P. I. P., Marcilio, I., Barral-Netto, M., &
Boaventura, V. S. (2026). Anticipating influenza-like illness outbreaks via syndromic surveillance using over-the-counter
drug sales and primary health care data. *npj Digital Public Health, 1*. https://doi.org/10.1038/s44482-026-00014-w

Pannoi, T., Sawangppon, S., & Pan, W. C. (2026). Climatic determinants of antibiotic use in Southern Thailand:
Retrospective longitudinal study during 2021 to 2023. *Environmental Epidemiology, 10*(1).
https://doi.org/10.1097/ee9.0000000000000460

Philippine Atmospheric, Geophysical and Astronomical Services Administration. (n.d.). *Climate of the Philippines*.
https://www.pagasa.dost.gov.ph/information/climate-philippines

Philippine Statistics Authority. (2024). *Households share 44.4 percent of the country's total health spending in
2023* (Philippine National Health Accounts). https://psa.gov.ph/statistics/pnha

Philippine Statistics Authority. (2025). *Registered deaths in the Philippines, 2023*.
https://psa.gov.ph/content/registered-deaths-philippines-2023

Reyes, C. M., & Tabuga, A. D. (2020). *A profile of the Philippine pharmaceutical industry* (PCC Issues Paper No. 02,
Series of 2020). Philippine Competition Commission.
https://www.phcc.gov.ph/storage/pdf-resources/1678085936_PCC-Issues-Paper-2020-02-A-Profile-of-the-Philippine-Pharmaceutical-Industry.pdf

Rysava, K., Espineda, J., Silo, E. A. V., Carino, S., Aringo, A. M., Bernales, R. P., Adonay, F. F., Tildesley, M. J.,
& Hampson, K. (2022). One Health surveillance for rabies: A case study of integrated bite case management in Albay
Province, Philippines. *Frontiers in Tropical Diseases, 3*, 787524. https://doi.org/10.3389/fitd.2022.787524

Seposo, X., Valenzuela, S., Apostol, G. L., Wangkay, K. A., Lao, P. E., & Enriquez, A. B. (2024). Projecting
temperature-related dengue burden in the Philippines under various socioeconomic pathway scenarios. *Frontiers in Public
Health, 12*, 1420457. https://doi.org/10.3389/fpubh.2024.1420457

Singh, S., Sharma, H., & Aggarwal, V. (2026). Optimizing drug availability and reducing wastage through ABC-XYZ
inventory management: Insights from a public tertiary cancer hospital in Northern India. *Indian Journal of
Pharmacology, 58*(4), 387–390. https://doi.org/10.4103/ijp.ijp_871_25

Tan, B., De Vera, P., Abrazaldo, J., & Ng, C. (2025). Flood-associated disease outbreaks and transmission in Southeast
Asia. *Frontiers in Microbiology, 16*, 1694246. https://doi.org/10.3389/fmicb.2025.1694246

WHO Collaborating Centre for Drug Statistics Methodology. (n.d.). *ATC: Structure and principles*. Norwegian Institute
of Public Health. https://atcddd.fhi.no/atc/structure_and_principles/

Statutes (cite by title and number in text; add Official Gazette links when formatting): Generics Act of 1988, Republic
Act No. 6675 (1988); Government Procurement Reform Act, Republic Act No. 9184 (2003); Anti-Rabies Act of 2007, Republic
Act No. 9482 (2007); Universally Accessible Cheaper and Quality Medicines Act of 2008, Republic Act No. 9502 (2008);
Corporate Recovery and Tax Incentives for Enterprises (CREATE) Act, Republic Act No. 11534 (2021); New Government
Procurement Act, Republic Act No. 12009 (2024), https://lawphil.net/statutes/repacts/ra2024/ra_12009_2024.html

## Sections 2.5.5 and 2.5.6: how the uploaded framework PDF was used

Sections 2.5.5 and 2.5.6 apply Sections 1–6 of *PH_Pharmaceutical_Distribution_Disease_Analysis_and_RRL.pdf* (uploaded
15 November 2026) as background and as stated expectations, after checking each point against its source.

| From the PDF | Used? | Reason |
|---|---|---|
| Chronic and infectious disease both matter | Yes, with PSA figures | PDF Table 1 ranks did not match PSA 2023 (it had 19.0% / 10.2% and pneumonia sixth at 5.6%); PSA figures used instead |
| "Non-communicable diseases are 70–72.4% of market value" | Corrected | The source says prescription products are about 70% of value (Magno, 2022); that is not the chronic-disease share. 72.4% was not found |
| Reyes & Tabuga (2018), PIDS | Corrected | The paper is PCC Issues Paper No. 02, Series of 2020 |
| Out-of-pocket share 40–45% | Yes | 44.4% in 2023 (PSA) |
| Generics Act, Cheaper Medicines Act, CREATE Act VAT exemption | Yes | Section 12 of the Act read in full (16 Nov): it sets both groups of medicines and their start dates |
| Seasons: hot dry, rainy, cool dry | Yes | Months from PAGASA; the PDF's lag windows (1–4 weeks) had no source and are not used |
| WHO ATC classification | Yes | Basis for the category mapping |
| Four analytics tiers; steady chronic vs seasonal infection tracks; ABC–XYZ | Yes, as the design expectation tested in Chapter 4 | ABC–XYZ cut-offs stay at the registered 0.5 and 1.0, not the PDF's 0.2 and 0.5 |
| Disease-to-medicine tables (Tables 1–3) | Partly | Used only as the rationale for the registered disease–category pairs; brand lists not reproduced (one error: Humulin is insulin, not metformin) |
| Quiambao et al. (2023) on animal bite centres | Replaced | The DOI given resolves to a different paper (an Indian One Health study); Rysava et al. (2022) used instead |
| +45% and +35% safety stock, +11.4 days port delay, surge alerts 4–6 weeks ahead, automated purchase orders | No | No source; and the system authorizes no purchases |
| DOH FHSIS morbidity ranking, "double burden" attributed to DOH (2023b), retail per-tablet buying | Not yet | Sources not checked; add only after reading them |

## Verification notes

| Source | Checked via | Notes |
|---|---|---|
| Seposo et al. 2024 | Publisher full text | The paper reports both 72.1% and 72.2% for the attributable share; 72.1% (1,370,009 of 1,909,209) is used here |
| Cawiding et al. 2025 | Crossref metadata and abstract | Publisher page blocked automated access; findings from the abstract |
| De Guzman et al. 2025 | Publisher full text | Record count given as 8,346 and 8,436 in different places; not used |
| Tan et al. 2025 | PubMed Central full text | Associations by timing only; the authors do not claim causation |
| Interior et al. 2025 | PubMed Central | 43.4% (abstract says 43.45%) |
| Oliveira et al. 2026 | Crossref metadata; preprint abstract (Europe PMC) | Published full text is behind a login and was not read. The 2025 preprint confirms 510 regions and that drug sales flagged surges 1 to 3 weeks ahead. Its accuracy figures differ from those reported for the published version, so none is quoted here |
| Pannoi et al. 2026 | Full text (PMC12875700), read 16 Nov | The article is inconsistent: the abstract reports a January tetracycline peak and a 2 °C drop threshold, while the results and conclusions report minimal tetracycline seasonality and the methods define a drop as 1 °C. The text here states only what both parts support and quotes no percentages |
| Fourkiotis & Tsadiras 2024 | Crossref abstract | |
| Liu et al. 2026 | PubMed Central full text | |
| Singh et al. 2026 | PubMed Central | |
| Abrigo et al. 2021 | PIDS PDF | Discussion paper: unreviewed, as the series itself states |
| Reyes & Tabuga 2020 | PCC PDF, read locally | Market figures are for 2016 (IQVIA data); commissioned study, views of the authors |
| Magno 2022 | PCC PDF, read locally | Discussion paper, not peer-reviewed, as the series states; its 70% figure cites older IMS data |
| PSA 2025, 2024 | PSA pages block automated access; figures cross-checked | Deaths: 694,821 total and the four shares match a Xinhua report of the PSA release dated 31 January 2025, hence the year 2025. Health accounts: 44.4% is the title of the PSA page itself; news coverage dates the release to August 2024. Open both pages once by hand to record their reference numbers |
| PAGASA n.d. | PAGASA page | The page gives the seasons; it does not use the names Habagat or Amihan |
| WHO Collaborating Centre n.d. | Official ATC page | |
| Rysava et al. 2022 | Crossref metadata and abstract | Quotation is from the abstract; one province (Albay) |
| Statutes | RA 12009 and RA 11534 (Section 12) texts read; others by well-known title and number | RA 12009 repealed RA 9184 with a transition period; most of 2017–2024 fell under RA 9184 |

Not yet verified and not used in the text above: the Rwanda NCD random-forest study, the Lancet Planetary Health heat
and kidney study, the extreme-heat and diabetes systematic review, and the IHME and CPBRD burden profiles (listed in
`rrl_sources_2021_2026.md`).
