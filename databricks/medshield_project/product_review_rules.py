"""Literal catalog review proposals; never a Gold resolution or approval policy.

Price/customer/transaction quantity are deliberately absent from product identity.
This module reads no files and never changes source titles, amounts or sales rows.
Extracted attributes still require evidence: a title is not a verified package.
"""
import re


PROPOSAL_POLICY = "product_review_v3_context_literal_pricing"
_NUMBER = r"(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)"
_FRACTION = _NUMBER + r"\s*/\s*\d+(?:\.\d+)?"
_START = r"(?<![\d.,/])"
_PACK_INTEGER = r"(?:\d{1,3}(?:,\d{3})+|\d+)(?![\d.,/])(?!\s*[/.,]\s*\d)"
_MASS_UNIT = r"(?:MCG|MG|MEQ|IU|UNITS|G)"
_MASS = _NUMBER + r"\s*(?:ANTI[- ]XA\s+)?" + _MASS_UNIT
_RATIO = re.compile(
    _START + _MASS + r"(?:\s*[+/]\s*" + _MASS + r")*\s*/\s*(?:"
    + _NUMBER + r"\s*)?(?:ML|CC|G|L)\b"
)
_CAPACITY = re.compile(_START + r"(?:" + _FRACTION + r"|" + _NUMBER + r")\s*(?:ML|CC|L|LITERS?|LITRES?)\b")
_MASS_TOKEN = re.compile(_START + _MASS + r"\b")
_DEVICE = re.compile(r"\b(?:CANNULA|NEEDLES?|SYRINGES?|CATHETERS?|SUTURES?)\b")
_NET_MASS = re.compile(
    r"\b(?:OINTMENT|CREAM|GEL|TOOTHPASTE|COTTON|JELLY|COFFEE|MILK|FOOD|"
    r"CLEANER|CLEANSER|DISINFECTANT|DETERGENT)\b"
)
_CATEGORY_CONTEXTS = {"medicine", "medical_supply", "medical_equipment", "non_medical", "unclassified"}
_MARKETING = re.compile(r"\b(?:ENERGY|SAVINGS?|EFFICIENCY|DISCOUNT|BATTERY|HUMIDITY)\b")
_CALIBRATED_CONTAINER = re.compile(
    r"\b(?:CUP|CONTAINER)\b[^;]*?\bWITH\s+CALIBRATION\b"
)
_CALIBRATION_DEVICE = re.compile(
    r"\b(?:MONITOR|MACHINE|EQUIPMENT|THERMOMETER|SCALE|ECG|F\d+|IM\d+[A-Z]?)\b"
)
_CALIBRATION_SERVICE = re.compile(
    r"\b(?:CLEANING\s+AND\s+CALIBRATION|CALIBRATION\s+SERVICE|"
    r"SERVICE\s+CALIBRATION|CALIBRATION\s+VERIFICATION)\b"
)
_UNITS = {
    "Box": r"BOX(?:ES)?|BX", "Pack": r"PACKS?|PK", "Piece": r"PIECES?|PCS?|PCE",
    "Vial": r"VIALS?", "Bottle": r"BOTTLES?|BTL|BOT",
    "Ampoule": r"AMPOULES?|AMPULES?|AMPS?", "Roll": r"ROLLS?",
    "Kit": r"KITS?", "Pair": r"PAIRS?", "Set": r"SETS?", "Sachet": r"SACHETS?",
}
_UNIT_PATTERN = "(?:" + "|".join(_UNITS.values()) + ")"
_OUTER_UNIT = r"(?:BOX(?:ES)?|BX|PACKS?|PK|KITS?|SETS?)"
_CONTAINED_PATTERN = r"(?:" + _UNIT_PATTERN + r"|TABLETS?|TABS?|CAPSULES?|CAPS?)"


def _label(value):
    return re.sub(r"\s+", " ", str(value or "").strip()).upper()


def _unit(value):
    for name, pattern in _UNITS.items():
        if re.fullmatch(pattern, value):
            return name
    if re.fullmatch(r"TABLETS?|TABS?", value):
        return "Tablet"
    if re.fullmatch(r"CAPSULES?|CAPS?", value):
        return "Capsule"
    return "Unknown"


def _unique(values):
    return list(dict.fromkeys(values))


def _overlaps(match, spans):
    return any(match.start() < end and start < match.end() for start, end in spans)


def proposal_attributes(title, *, category_context=None):
    """Return conservative literal candidates, with every result needing review.

    No numeric equivalence, pack conversion, category, stable SKU, or price split
    is inferred. Unknown packaging/counts are kept unknown rather than Piece/1.
    Concentration denominators are excluded from container capacity candidates.
    Optional category context is itself an unverified proposal. It only helps
    distinguish gram net-mass clues; it never supplies a category or approval.
    """
    if category_context is not None and category_context not in _CATEGORY_CONTEXTS:
        raise ValueError("Invalid proposal category context")
    title = _label(title)
    warnings, specifications = [], []
    ratios = list(_RATIO.finditer(title))
    ratio_spans = [match.span() for match in ratios]
    concentrations = [match.group() for match in ratios]
    if any(re.search(r"[+/].*(?:MCG|MG|MEQ|IU|UNITS|G).*/", match.group()) for match in ratios):
        warnings.append("combination_concentration_requires_review")

    for match in re.finditer(_START + _NUMBER + r"\s*%(?:\s*[WV]\s*/\s*[WV])?", title):
        if _MARKETING.search(title):
            specifications.append(match.group())
            warnings.append("marketing_percentage_not_concentration")
        else:
            concentrations.append(match.group())

    capacities = []
    for match in _CAPACITY.finditer(title):
        if _overlaps(match, ratio_spans):
            continue
        literal = match.group()
        if "/" in literal and not _DEVICE.search(title):
            specifications.append(literal)
            warnings.append("ambiguous_fraction_or_missing_ratio_unit")
            continue
        capacities.append(literal)
    strengths = []
    for match in _MASS_TOKEN.finditer(title):
        if _overlaps(match, ratio_spans):
            continue
        literal = match.group()
        if re.search(r"(?<![A-Z])G$", literal) or re.fullmatch(_NUMBER + r"\s*G", literal):
            if _DEVICE.search(title):
                specifications.append(literal)
                warnings.append("gauge_not_mass_strength")
                continue
            if _NET_MASS.search(title) or category_context == "non_medical":
                capacities.append(literal)
                warnings.append("net_mass_container_requires_review")
                continue
        strengths.append(literal)
    if len(_unique(capacities)) > 1:
        warnings.append("multiple_container_sizes_require_review")

    units = [(match, _unit(match.group())) for match in re.finditer(r"\b" + _UNIT_PATTERN + r"\b", title)]
    units = [(match, unit) for match, unit in units
             if not (unit == "Roll" and re.match(r"\s+BY\b", title[match.end():]))]
    if re.search(r"\bROLL\s+BY\b", title):
        warnings.append("roll_by_is_not_packaging")
        specifications.append("ROLL BY")
    packaging, contained = "Unknown", ""
    counts = []

    # "50 PAIRS/BOX" gives an explicit inner unit and outer package; a bare
    # "PAIRS/BOX" does not provide a count. A dimension never uses this route.
    inner_outer = list(re.finditer(
        _START + r"\b(?:(" + _PACK_INTEGER + r")\s+)?(" + _CONTAINED_PATTERN + r")\s*/\s*(" + _OUTER_UNIT + r")\b", title
    ))
    outer_count = list(re.finditer(
        r"\b(" + _OUTER_UNIT + r")\s+(?:OF\s+)?(" + _PACK_INTEGER + r")\b(?:\s+(" + _CONTAINED_PATTERN + r")\b)?", title
    ))
    explicit_packages = []
    for match in inner_outer:
        if match[1] and not re.search(r"[\d.,/]\s*$", title[:match.start(1)]):
            counts.append(match[1])
        contained = _unit(match[2])
        explicit_packages.append(_unit(match[3]))
    for match in outer_count:
        explicit_packages.append(_unit(match[1]))
        counts.append(match[2])
        if match[3]:
            contained = _unit(match[3])
    counts.extend(match[1] for match in re.finditer(_START + r"\b(" + _PACK_INTEGER + r")\s*['’]S\b", title)
                  if not re.search(r"[\d.,/]\s*$", title[:match.start(1)]))

    # Nxvolume is only a bundle/count candidate when the title explicitly names
    # an outer package. NxMM/CM and bare dimensions are never package counts.
    bundles = [match for match in re.finditer(_START + r"\b(" + _PACK_INTEGER + r")\s*[X×]\s*" + _NUMBER + r"\s*(?:ML|CC|L)\b", title)
               if not re.search(r"[\d.,/]\s*$", title[:match.start(1)])]
    bundle_specification = " / ".join(match.group() for match in bundles)
    for match in bundles:
        if re.search(r"\b" + _OUTER_UNIT + r"\b", title):
            counts.append(match[1])
            warnings.append("bundle_contents_require_review")
        else:
            specifications.append(match.group())
            warnings.append("multipack_or_dimension_requires_review")
    outer_candidates = explicit_packages or [unit for _, unit in units if unit in {"Box", "Pack", "Kit", "Set"}]
    if len(_unique(outer_candidates)) == 1:
        packaging = outer_candidates[0]
    elif len(_unique(outer_candidates)) > 1:
        warnings.append("multiple_outer_packages_require_review")
    elif len(_unique(unit for _, unit in units)) == 1:
        packaging = units[0][1]
    elif units:
        warnings.append("multiple_unit_tokens_require_review")

    # Integer thousands separators are display formatting, not a conversion of
    # sellable units. Invalid grouping, decimals and fractions never match a
    # shorter integer substring. Source title literals remain unchanged.
    counts = _unique(count.replace(",", "") for count in counts)
    pack_count = counts[0] if len(counts) == 1 and re.fullmatch(r"[1-9]\d*", counts[0]) else ""
    if counts and not pack_count:
        warnings.append("conflicting_or_invalid_pack_counts")
    if not contained and packaging in {"Box", "Pack", "Kit", "Set"}:
        remaining = _unique(unit for _, unit in units if unit != packaging)
        if len(remaining) == 1:
            contained = remaining[0]
    if packaging == "Unknown":
        warnings.append("sellable_packaging_unknown")
    if not pack_count:
        warnings.append("pack_count_unknown")
    if not contained:
        warnings.append("contained_unit_unknown")

    # Keep sizes/models/brands/descriptors visible without treating them as a
    # confirmed attribute. Neither gauge G20 nor rating KN95 is a contract ID.
    for pattern in (
        r"\b(?:G\.?\d+|\d+G)(?:\s*[X×]\s*\d+(?:\s*/\s*\d+)?(?:MM|CM|ML|CC)?)?(?![A-Z\d./])",
        r"(?<![A-Z\d.])" + _NUMBER + r"(?:\s*[X×]\s*" + _NUMBER + r")+(?:\s*(?:MM|CM|ML|CC|M|L|INCH(?:ES)?))?(?![A-Z\d./])",
        r"\bSIZE\s+" + _NUMBER,
        r"#\s*\d+",
        r"\b[A-Z]+[-]?\d+[A-Z]*\b",
        r"\([^()]+\)",
    ):
        specifications.extend(match.group() for match in re.finditer(pattern, title))
    if re.search(r"\b(?:ASSORTED|VARIOUS|EITHER|OR)\b", title) or len(_unique(capacities)) > 1:
        warnings.append("ambiguous_options_or_assortment")
    item_kind = "unknown"
    if re.search(r"\bREPAIRS?\b", title):
        item_kind = "service"
    elif _CALIBRATED_CONTAINER.search(title):
        specifications.append("CALIBRATION")
        warnings.append("calibrated_container_markings_require_review")
    elif re.search(r"\bCALIBRATION\b", title):
        if _CALIBRATION_DEVICE.search(title) or _CALIBRATION_SERVICE.search(title):
            item_kind = "service"
        else:
            specifications.append("CALIBRATION")
            warnings.append("calibration_context_requires_review")
    if item_kind == "service":
        warnings.append("service_keyword_requires_review")

    return {
        "strength": " / ".join(_unique(strengths)),
        "concentration": " / ".join(_unique(concentrations)),
        "container_size": " / ".join(_unique(capacities)),
        "packaging_unit": packaging, "pack_count": pack_count,
        "contained_unit": contained, "bundle_specification": bundle_specification,
        "item_kind": item_kind, "specification_tokens": _unique(specifications),
        "warnings": _unique(warnings), "status": "needs_review",
        "proposal_policy": PROPOSAL_POLICY,
    }
