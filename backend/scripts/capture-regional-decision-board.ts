// Offline retained-source contract check; this is never an application fallback.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {validateRegionalStl} from '../src/regionalStlReview'
import {buildRegionalDecisionBoard} from '../src/regionalDecisionBoard'
const financial=JSON.parse(readFileSync('../outputs/so1_regional_stl_20261028/source.json','utf8'))
const stl=validateRegionalStl(readFileSync('../outputs/so1_regional_stl_20261028/analysis.json','utf8'),financial)
mkdirSync('../outputs/wp14_decision_board_20261030',{recursive:true})
writeFileSync('../outputs/wp14_decision_board_20261030/response.json',JSON.stringify(buildRegionalDecisionBoard(financial,stl),null,2)+'\n',{flag:'wx'})
