"""Execute the actual Gold expression on hand-solvable SQL rows without Spark."""
import ast
from pathlib import Path
import sqlite3
import unittest

PROJECT=Path(__file__).resolve().parents[1]

class Expr:
    def __init__(self,sql): self.sql=sql
    def isNotNull(self): return Expr(f'({self.sql} IS NOT NULL)')
    def __and__(self,other): return Expr(f'({self.sql} AND {other.sql})')
    def __gt__(self,other): return Expr(f'({self.sql}>{other})')
    def __ne__(self,other): return Expr(f'({self.sql}<>{other})')
    def __truediv__(self,other): return Expr(f'({self.sql}/{other.sql})')
    def __mul__(self,other): return Expr(f'({self.sql}*{other})')

class Functions:
    col=staticmethod(lambda name:Expr('"'+name+'"'))
    round=staticmethod(lambda value,places:Expr(f'ROUND({value.sql},{places})'))
    when=staticmethod(lambda condition,value:Expr(f'CASE WHEN {condition.sql} THEN {value.sql} END'))

class Frame:
    def withColumn(self,name,expression): self.expression=expression.sql;return self

class GoldMarginContractTests(unittest.TestCase):
    def test_actual_gold_expression_preserves_signed_amounts_and_requires_positive_basis(self):
        tree=ast.parse((PROJECT/'03_sales_gold.py').read_text(encoding='utf-8'))
        function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='with_margin_rate')
        namespace={'F':Functions}
        exec(compile(ast.Module(body=[function],type_ignores=[]),'Gold.with_margin_rate','exec'),namespace)
        frame=namespace['with_margin_rate'](Frame())
        with sqlite3.connect(':memory:') as db:
            db.execute('CREATE TABLE examples(gross_margin_amount REAL,margin_net_sales_basis REAL)')
            values=[(50.,400.),(-50.,-400.),(50.,0.),(50.,None),(None,400.),(-50.,400.),(1.,3.)]
            db.executemany('INSERT INTO examples VALUES (?,?)',values)
            rows=db.execute(f'SELECT gross_margin_amount,margin_net_sales_basis,{frame.expression} FROM examples ORDER BY rowid').fetchall()
        self.assertEqual([r[:2] for r in rows],values)
        self.assertEqual([r[2] for r in rows],[12.5,None,None,None,None,-12.5,33.3333])

if __name__=='__main__': unittest.main()
