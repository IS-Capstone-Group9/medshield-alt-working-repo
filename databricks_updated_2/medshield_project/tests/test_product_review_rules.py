import sys
from pathlib import Path
import unittest


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from product_review_rules import PROPOSAL_POLICY, proposal_attributes


class ProductReviewRulesTests(unittest.TestCase):
    def test_thousands_and_fractions_do_not_become_truncated_numbers(self):
        self.assertEqual(proposal_attributes("NYSAPH 100,000 IU SUS")["strength"], "100,000 IU")
        self.assertEqual(proposal_attributes("BIOPHEN 1,000,000 IU 10ML")["strength"], "1,000,000 IU")
        self.assertEqual(proposal_attributes("DRAINAGE BAG 2,000ML - INDOPLAS")["container_size"], "2,000ML")
        syringe = proposal_attributes("INSULIN SYRINGE WITH NEEDLE 1/2CC 29GX1/2 (TERUMO)")
        self.assertEqual(syringe["container_size"], "1/2CC")
        self.assertIn("29GX1/2", syringe["specification_tokens"])
        self.assertEqual(proposal_attributes("MOXYLOR 250/5ML")["container_size"], "")
        malformed = proposal_attributes("EXAMPLE 1,00IU")
        self.assertEqual(malformed["strength"], "")

    def test_ratio_denominator_is_not_container_capacity(self):
        ratio = proposal_attributes("SQCEF 250MG/5ML")
        self.assertEqual(ratio["concentration"], "250MG/5ML")
        self.assertEqual(ratio["container_size"], "")
        self.assertEqual(proposal_attributes("BIOGIC 125MG / 5ML")["concentration"], "125MG / 5ML")
        combo = proposal_attributes("LACTAMOX 250MG/62.5MG/5ML")
        self.assertEqual(combo["concentration"], "250MG/62.5MG/5ML")
        self.assertEqual(combo["container_size"], "")
        self.assertIn("combination_concentration_requires_review", combo["warnings"])
        combo = proposal_attributes("RELAXSAPH 500MCG+2.5MG/2.5ML")
        self.assertEqual(combo["concentration"], "500MCG+2.5MG/2.5ML")
        volume = proposal_attributes("ANTIZOAL 5MG/ML (500MG/100ML) 100ML")
        self.assertEqual(volume["container_size"], "100ML")
        self.assertEqual(volume["concentration"], "5MG/ML / 500MG/100ML")

    def test_iu_ratios_and_percent_bases_remain_literal(self):
        self.assertEqual(proposal_attributes("EPOKINE 10,000IU/1ML")["concentration"], "10,000IU/1ML")
        self.assertEqual(proposal_attributes("ABHAY-TOX 40IU/0.5ML VIAL")["concentration"], "40IU/0.5ML")
        value = proposal_attributes("ENOX 4000 ANTI-XA IU/0.4ML STERIL")
        self.assertEqual(value["concentration"], "4000 ANTI-XA IU/0.4ML")
        self.assertEqual(value["container_size"], "")
        ointment = proposal_attributes("FUSIFRED 20MG/G (2% W/W) 10G")
        self.assertEqual(ointment["concentration"], "20MG/G / 2% W/W")
        self.assertEqual(proposal_attributes("HYCLENS 0.2% WOUND SPRAY 60ML")["concentration"], "0.2%")

    def test_gauge_does_not_become_gram_strength(self):
        cannula = proposal_attributes("IV CANNULA 20G - HEXACARE")
        self.assertEqual(cannula["strength"], "")
        self.assertIn("20G", cannula["specification_tokens"])
        self.assertIn("gauge_not_mass_strength", cannula["warnings"])
        self.assertEqual(proposal_attributes("SITIXON 1G")["strength"], "1G")
        paste = proposal_attributes("TOOTHPASTE COLGATE 37G")
        self.assertEqual(paste["strength"], "")
        self.assertEqual(paste["container_size"], "37G")

    def test_explicit_pack_counts_and_plural_units(self):
        gloves = proposal_attributes("STERILE SURGICAL GLOVES 50 PAIRS/BOX SIZE 7.5 HEXACARE")
        self.assertEqual((gloves["packaging_unit"], gloves["pack_count"], gloves["contained_unit"]), ("Box", "50", "Pair"))
        self.assertIn("SIZE 7.5", gloves["specification_tokens"])
        self.assertEqual(proposal_attributes("STERILE SURGICAL GLOVES PAIRS/BOX SIZE 7.0")["pack_count"], "")
        self.assertEqual(proposal_attributes("BUPIRIGHT 1'S VIALS")["packaging_unit"], "Vial")
        self.assertEqual(proposal_attributes("HYPHEN 50MG AMP")["packaging_unit"], "Ampoule")
        self.assertEqual(proposal_attributes("TOILET TISSUE - PER PCS")["packaging_unit"], "Piece")
        box = proposal_attributes("EXAMPLE BOX OF 100 PIECES")
        self.assertEqual((box["packaging_unit"], box["pack_count"], box["contained_unit"]), ("Box", "100", "Piece"))
        self.assertEqual(proposal_attributes("KN95 FACE MASK (BOX)")["pack_count"], "")
        self.assertEqual(proposal_attributes("KN95 FACEMASK (PIECE)")["pack_count"], "")

    def test_bundle_volume_is_not_dimension_or_conversion(self):
        bundle = proposal_attributes("PAPANICOLAOU STAIN SET 10X500ML (MEDIC)")
        self.assertEqual(bundle["bundle_specification"], "10X500ML")
        self.assertEqual(bundle["pack_count"], "10")
        self.assertEqual(bundle["container_size"], "500ML")
        self.assertNotIn("10X500M", bundle["specification_tokens"])
        self.assertIn("bundle_contents_require_review", bundle["warnings"])
        for title in ("IV CANNULA G20 1.1X32MM", "GAUZE PAD 4X4X8 PLY 24X28 MESH", "MATTRESS 2X36X75"):
            self.assertEqual(proposal_attributes(title)["pack_count"], "", title)
        self.assertEqual(proposal_attributes("EXAMPLE 2X5ML")["pack_count"], "")
        self.assertEqual(proposal_attributes("EXAMPLE BOX OF 50 PIECES 100'S")["pack_count"], "")

    def test_package_count_keeps_full_integer_without_partial_numeric_matches(self):
        for title in ("EXAMPLE BOX OF 1,000 PIECES", "EXAMPLE 1,000'S", "EXAMPLE 1,000 PAIRS/BOX", "EXAMPLE BOX OF 1,000 PIECES 1000'S"):
            self.assertEqual(proposal_attributes(title)["pack_count"], "1000", title)
        self.assertEqual(proposal_attributes("EXAMPLE 1,000,000'S")["pack_count"], "1000000")
        self.assertEqual(proposal_attributes("STAIN SET 1,000X500ML")["pack_count"], "1000")
        for title in ("EXAMPLE BOX OF 1.5 PIECES", "EXAMPLE BOX OF 1/2 PIECES", "EXAMPLE BOX OF 1 / 2 PIECES", "EXAMPLE BOX OF 1,00 PIECES", "EXAMPLE 1,00'S", "EXAMPLE 1.5 PAIRS/BOX", "EXAMPLE 1 / 2 PAIRS/BOX", "EXAMPLE 1 / 2'S", "KN95 BOX SIZE 1,000", "GAUZE PAD 1,000X24 MESH"):
            self.assertEqual(proposal_attributes(title)["pack_count"], "", title)

    def test_motion_and_marketing_tokens_do_not_create_pack_or_concentration(self):
        device = proposal_attributes("BLOOD PRESSURE W/WHEELS / ROLL BY - BAXTEL SPHYGMOMANOMETER")
        self.assertEqual(device["packaging_unit"], "Unknown")
        self.assertIn("roll_by_is_not_packaging", device["warnings"])
        led = proposal_attributes("WHITE LED 85% ENERGY SAVINGS MERCURY FREE 12 WATTS FIREFLY")
        self.assertEqual(led["concentration"], "")
        self.assertIn("85%", led["specification_tokens"])
        self.assertIn("marketing_percentage_not_concentration", led["warnings"])
        self.assertEqual(proposal_attributes("GAUZE ROLL 28X24")["packaging_unit"], "Roll")

    def test_assortment_options_and_unknowns_stay_unresolved(self):
        for title in ("ASSORTED STERILE GLOVES", "INSULIN SYRINGE G30X1/2CC / G30X1CC", "STAMP PAD INK,PURPLE OR VIOLET 50ML (30ML) (JOY)"):
            value = proposal_attributes(title)
            self.assertIn("ambiguous_options_or_assortment", value["warnings"], title)
            self.assertEqual(value["status"], "needs_review")
        options = proposal_attributes("INSULIN SYRINGE G30X1/2CC / G30X1CC")
        self.assertEqual(options["container_size"], "1/2CC / 1CC")
        self.assertNotIn("30X1", options["specification_tokens"])
        value = proposal_attributes("KLOPIDO")
        self.assertEqual((value["packaging_unit"], value["pack_count"]), ("Unknown", ""))
        self.assertEqual(value["strength"], "")
        self.assertEqual(proposal_attributes("KLOPIDO 75MG")["strength"], "75MG")

    def test_parser_does_not_generate_approval_sku_category_or_price_key(self):
        for title in ("KN95 PIECE BULK PRICE 15", "KN95 PIECE PRICE 20", "FEBRILE FREE 500MG", "F6 FETAL MONITOR SINGLE", "IM70 PATIENT MONITOR W/ CAPNOGRAPH", "F6 REPAIR"):
            value = proposal_attributes(title)
            self.assertEqual(value["status"], "needs_review")
            self.assertEqual(value["proposal_policy"], PROPOSAL_POLICY)
            for field in ("canonical_sku", "canonical_group_id", "is_duplicate", "category", "price", "forecast_eligible"):
                self.assertNotIn(field, value)
        self.assertEqual(proposal_attributes("F6 REPAIR")["item_kind"], "service")
        self.assertEqual(proposal_attributes("F6 FETAL MONITOR SINGLE")["item_kind"], "unknown")

    def test_calibrated_container_is_not_a_calibration_service(self):
        cup = proposal_attributes("SPECIMEN CUP WITH CALIBRATION")
        self.assertEqual(cup["item_kind"], "unknown")
        self.assertIn("CALIBRATION", cup["specification_tokens"])
        self.assertIn("calibrated_container_markings_require_review", cup["warnings"])
        self.assertNotIn("service_keyword_requires_review", cup["warnings"])
        self.assertEqual(cup["status"], "needs_review")
        for title in ("F6 CALIBRATION", "CLEANING AND CALIBRATION/CALIBRATION VERIFCATION"):
            with self.subTest(title=title):
                value = proposal_attributes(title)
                self.assertEqual(value["item_kind"], "service")
                self.assertIn("service_keyword_requires_review", value["warnings"])
                self.assertEqual(value["status"], "needs_review")
        ambiguous = proposal_attributes("CALIBRATION")
        self.assertEqual(ambiguous["item_kind"], "unknown")
        self.assertIn("calibration_context_requires_review", ambiguous["warnings"])

    def test_nonmedical_gram_mass_is_not_pharmaceutical_strength(self):
        examples = (
            ("ANMUM MATERNA PLAIN 180G X 24", "180G", "180G"),
            ("ANMUM MATERNA CHOCO 180G X 24", "180G", "180G"),
            ("ANMUM MATERNA PLAIN 180G", "180G", "180G"),
            ("COFFEE GREAT TASTE PREMIUM 25G", "25G", "25G"),
            ("LYSOL 340G", "340G", "340G"),
            ("LYSOL 510G", "510G", "510G"),
            ("DISINFECTANT SPRAY 170G 227ML (LYSOL)", "170G", "227ML / 170G"),
            ("DETERGENT POWDER 500G (PRIDE)", "500G", "500G"),
            ("DETERGENT POWDER 500G (PRIDE) SOAP", "500G", "500G"),
        )
        for title, mass, container in examples:
            with self.subTest(title=title):
                value = proposal_attributes(title, category_context="non_medical")
                self.assertEqual(value["strength"], "")
                self.assertEqual(value["container_size"], container)
                self.assertIn(mass, value["container_size"])
                self.assertIn("net_mass_container_requires_review", value["warnings"])
                self.assertEqual(value["status"], "needs_review")
                self.assertNotIn("category", value)
                self.assertEqual(value["pack_count"], "")
        coffee = proposal_attributes("COFFEE GREAT TASTE PREMIUM 25G")
        self.assertEqual(coffee["strength"], "")
        self.assertEqual(coffee["container_size"], "25G")
        medicine = proposal_attributes("SITIXON 1G", category_context="medicine")
        self.assertEqual(medicine["strength"], "1G")
        self.assertEqual(medicine["container_size"], "")
        supplement = proposal_attributes("APCELAC 500MG HERBAL FOOD SUPPLEMENT", category_context="non_medical")
        self.assertEqual(supplement["strength"], "500MG")
        self.assertEqual(supplement["container_size"], "")
        unknown = proposal_attributes("UNIDENTIFIED 1G", category_context="unclassified")
        self.assertEqual(unknown["status"], "needs_review")
        self.assertEqual(unknown["container_size"], "")
        with self.assertRaisesRegex(ValueError, "Invalid proposal category context"):
            proposal_attributes("UNIDENTIFIED 1G", category_context="approved")


if __name__ == "__main__":
    unittest.main()
