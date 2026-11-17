"""Client meeting brief PDF, 15 Nov 2026. Run from repo root."""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = Path.cwd() / 'outputs/client_meeting_20261115'
pdfmetrics.registerFont(TTFont('UI', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('UIB', 'C:/Windows/Fonts/segoeuib.ttf'))
INK, MUTED, ACCENT, RULE, SOFT = colors.HexColor('#16202b'), colors.HexColor('#55606b'), colors.HexColor('#1c5cab'), colors.HexColor('#d9dee4'), colors.HexColor('#eef3f9')
S = lambda name, **k: ParagraphStyle(name, fontName=k.pop('font', 'UI'), textColor=k.pop('color', INK), **k)
H1 = S('h1', font='UIB', fontSize=19, leading=23, spaceAfter=4)
H2 = S('h2', font='UIB', fontSize=12.5, leading=16, spaceBefore=12, spaceAfter=5, color=ACCENT)
BODY = S('b', fontSize=9.6, leading=13.4, spaceAfter=4)
SMALL = S('s', fontSize=8.4, leading=11.2, color=MUTED)
CELL = S('c', fontSize=8.6, leading=11.2)
CELLB = S('cb', font='UIB', fontSize=8.6, leading=11.2)
HEAD = S('hd', font='UIB', fontSize=8.4, leading=11, color=colors.white)
P = lambda t, st=BODY: Paragraph(t, st)

def table(rows, widths, head=True, row_height=None):
    data = [[P(c, HEAD if (head and i == 0) else (CELLB if j == 0 and not (head and i == 0) else CELL)) for j, c in enumerate(r)] for i, r in enumerate(rows)]
    heights = [None] + [row_height] * (len(rows) - 1) if row_height else None
    t = Table(data, colWidths=widths, repeatRows=1 if head else 0, rowHeights=heights)
    style = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.4, RULE),
             ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5)]
    if head: style += [('BACKGROUND', (0, 0), (-1, 0), ACCENT)]
    t.setStyle(TableStyle(style)); return t

def box(text):
    t = Table([[P(text, BODY)]], colWidths=[174 * mm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), SOFT), ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
                           ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    return t

story = [P('Meeting notes: finishing the MedShield sales study', H1),
         P('MedShield capstone team · 15 November 2026', SMALL), Spacer(1, 8),
         box("<b>Why we are meeting:</b> we have studied all of MedShield's sales records from January 2017 to September 2026. "
             "To finish, we need a few answers that only you can give, plus your view on what would help you most. "
             "We do not need customer names, prices or details of your orders and tenders."),
         P('The three most important questions', H2),
         table([['#', 'Question', 'Why we ask'],
                ['1', 'What would you most like help with first: monthly ordering, the yearly budget, or getting ready for big orders? And how close does an estimate need to be to be useful to you? (For example, within 20% or within 30%.)',
                 'This tells us what "good enough" means for you. Some of our estimates may already be close enough.'],
                ['2', 'Could you send the sales records from October 2026 onward, in the same format as before? Monthly would be ideal.',
                 'Our records stop at September 2026. Newer months let us check whether our estimates hold up.'],
                ['3', 'Could you check a short list of 15 products and tell us whether each sale is counted per piece or per box? (Yes/no list, about 10 minutes.)',
                 'Some products are recorded sometimes per piece and sometimes per box, so we cannot yet plan stock in boxes.']],
               [8 * mm, 96 * mm, 70 * mm]),
         P('Other helpful questions (if there is time)', H2),
         table([['#', 'Question', 'Why we ask'],
                ['4', 'At the start of each month, could you tell us just yes or no: do you expect a big order from a government office or hospital this month? No amounts or names.',
                 'Big orders are now more than half of sales and come almost every month, but past sales cannot tell how big the next one will be. Even a yes or no would help more than anything we can work out from the records.'],
                ['5', 'For orders from government offices and hospitals, which province were they delivered to? The province is enough.',
                 'Most sales have no location, so we cannot compare areas properly.'],
                ['6', 'For your main products, could you write the generic name next to the brand name? (List attached; partial is fine.)',
                 'Our records show brand names only. Generic names let us connect products to health trends such as dengue season.'],
                ['7', 'Could you look at 50 groups of product names and tell us whether each group is really the same product? (About 15 minutes.)',
                 'We grouped spelling and size variations of the same product. Your check makes the grouping reliable.'],
                ['8', 'What do the labels GOVERNMENT, HOSPITAL, ADMIN, EQUIPMENT and SUPPLIES mean in your records?',
                 'The labels seem to change between years, which makes year-to-year comparison harder.'],
                ['9', 'For a few regular products: roughly how long do suppliers take to deliver, and what does it cost to order and to store them?',
                 'This lets us suggest sensible order amounts using your real numbers instead of examples.'],
                ['10', 'When a big order is coming, how much notice do you usually get?', 'The products in big orders change a lot from order to order, so being ready means having cash, supplier credit and delivery capacity on hand. Knowing the usual notice tells us how much needs to be ready in advance.'],
                ['11', 'Are there records for the months missing before 2020? Is there a product list for the contract sales?', 'This would fill gaps in the history.']],
               [8 * mm, 96 * mm, 70 * mm]),
         P('What we noticed: does this match your experience?', H2),
         table([['What the records show', 'Question for you'],
                ['Orders have become much bigger. Big orders (₱500,000 or more) were almost none of sales in 2017 and about 60% in 2026.', 'Did MedShield move toward selling to government offices and hospitals on purpose?'],
                ['The profit margin went down, from about 71% in 2019 to about 49% in 2025. Most of this is because some high-margin products (SPEEDA, EVAPROST, EUROXONE, LACTAMOX) now sell much less, and newer products earn less.', 'Why did those products sell much less after 2019? Is the lower margin on newer products expected?'],
                ['A few products also earn much less than before: SPEEDA went from about 86% margin to 33%, and ZINACARE from about 92% to 48%.', 'Did their selling prices drop, or did their costs go up?'],
                ['Recent growth comes mainly from big orders and new products. In January to September 2026, sales of the same products as last year barely changed.', 'Is the move toward big orders from government offices and hospitals deliberate?'],
                ['Since January 2025, almost every month (20 of 21) had at least one big order. A month with big orders is usually about ₱3 million, but some 2026 months reached ₱13–15 million.', 'How do you currently prepare cash and stock when a big order comes in?'],
                ['Most new products do not last: only about 1 in 4 still sells a year later. Products that sell in at least 3 of their first 6 months are much more likely to stay.', 'How do you decide when a new product becomes a regular one?'],
                ['Most of the money comes from products that sell unevenly. Only a few products sell steadily every month.', 'Which products are most important to always have in stock?'],
                ['In 2025, more deliveries happened late in the month than in other years.', 'Did anything change in how deliveries or invoices are done?'],
                ['We did not find a clear link between sales and dengue or rainy seasons.', 'Do certain products sell more during dengue or rainy season?']],
               [92 * mm, 82 * mm]),
         P('What we can already show you', H2),
         P('• The regular, everyday part of sales can be estimated reasonably well.<br/>'
           '• By around the 20th of each month, we can estimate how the whole month will end up.<br/>'
           '• Big orders cannot be predicted from past sales, so the best approach is to be ready for them.<br/>'
           '• Everything is in one dashboard: sales review, which products and areas matter most, and stock planning.<br/>'
           '• The dashboard does not decide what to buy. It supports your decisions.'),
         P('Things to bring', H2),
         P('Laptop with the dashboard · the 15-product piece-or-box list · the 50-group product list · the generic-name list · these notes.'),
         KeepTogether([P('Answers', H2),
                       table([['Topic', 'Answer'], ['1 What to help with first, and how close is useful', ''], ['2 Newer sales records', ''], ['3 Piece or box list', ''],
                              ['4 Yes/no for big orders', ''], ['5 Provinces', ''], ['6–7 Generic names, product groups', ''],
                              ['8 Label meanings', ''], ['9–10 Delivery times, costs, notice', ''], ['11 Missing months, contracts', ''],
                              ['Comments on what we noticed', ''], ['Next meeting or follow-up date', '']],
                             [62 * mm, 112 * mm], row_height=13 * mm)])]

def footer(c, d):
    c.saveState(); c.setFont('UI', 7.5); c.setFillColor(MUTED)
    c.drawString(18 * mm, 10 * mm, 'MedShield capstone team · meeting notes · 15 Nov 2026'); c.drawRightString(192 * mm, 10 * mm, f'Page {d.page}'); c.restoreState()

doc = SimpleDocTemplate(str(OUT / 'MedShield_Client_Meeting_Brief_2026-11-15.pdf'), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                        topMargin=16 * mm, bottomMargin=16 * mm, title='MedShield meeting notes', author='MedShield Capstone Team')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print('ok')
