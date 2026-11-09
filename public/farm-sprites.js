// 家族小牧場的像素圖：全部用程式畫，不用外部素材，也就沒有授權問題。
// 每張 16×16，每個字元是一個像素（. 是透明），顏色對照 PALETTE。
// 'S' 是衣服顏色，畫角色時換成每位家人的頭像顏色。
// 改圖直接改下面的字串即可：每行 16 個字元、每張 16 行。

import { artSprite } from './farm-art.js';

export const PALETTE = {
 "o": "#2b2421",
 "h": "#5a3a22",
 "k": "#f2c7a0",
 "e": "#2b2421",
 "S": "SHIRT",
 "p": "#3b5b8c",
 "b": "#4a3222",
 "g": "#79c35a",
 "G": "#62ad4b",
 "q": "#98d66e",
 "y": "#dcbb87",
 "Y": "#c9a571",
 "z": "#b8956a",
 "f": "#b98f58",
 "F": "#a57f4c",
 "m": "#94673b",
 "M": "#7a5230",
 "n": "#5f4128",
 "N": "#4a311d",
 "L": "#3f9a3f",
 "D": "#2b7a33",
 "l": "#6cc25a",
 "t": "#7a4e2d",
 "T": "#5e3b20",
 "r": "#bd864f",
 "R": "#8d5d32",
 "w": "#4aa3df",
 "W": "#9ad6f6",
 "v": "#3487c6",
 "s": "#6b4a2b",
 "c": "#eef7df",
 "O": "#f28b2c",
 "x": "#e0393e",
 "X": "#a8252b",
 "i": "#ffffff",
 "j": "#f6d34a",
 "a": "#c3c8cc",
 "u": "#9a5cc6",
 "U": "#5e2f84",
 "P": "#d4691e",
 "V": "#b8506a",
 "C": "#d3edb0",
 "K": "#9dd17a",
 "Q": "#2f6b2a",
 "A": "#efe0a0",
 "H": "#c99a2e",
 "E": "#e6e2d6",
 "I": "#f4a3b5",
 "B": "#e9e4da",
 "Z": "#b5b0a6",
 "J": "#d6d1c7",
 "d": "#9c968b"
};

export const SPRITES = {
 "grass0": [
  "gggggggggggggggg",
  "gggggggggggggggg",
  "gggGgggggggggggg",
  "ggGqGggggggggggg",
  "gggggggggggggggg",
  "gggggggggggGgggg",
  "ggggggggggGqGggg",
  "gggggggggggggggg",
  "gggggggggggggggg",
  "ggggggGggggggggg",
  "gggggGqGgggggggg",
  "gggggggggggggggg",
  "gggggggggggggGgg",
  "ggggggggggggGqGg",
  "gggggggggggggggg",
  "gggggggggggggggg"
 ],
 "grass1": [
  "gggggggggggggggg",
  "ggggggggggGggggg",
  "gggggggggGqGgggg",
  "gggggggggggggggg",
  "gGgggggggggggggg",
  "GqGggggggggggggg",
  "gggggggggggggggg",
  "gggggggggggggggg",
  "gggggggggigggggg",
  "ggggggggijiggggg",
  "gggggggggigggggg",
  "gggggggggggggggg",
  "gggggggggggggggg",
  "ggggGggggggggggg",
  "gggGqGgggggggggg",
  "gggggggggggggggg"
 ],
 "grass2": [
  "gggggggggggggggg",
  "gggggggggggggggg",
  "gggggggggggggggg",
  "gggggggGgggggggg",
  "ggggggGqGggggggg",
  "gggggggggggggggg",
  "gggggggggggggggg",
  "ggGggggggggggggg",
  "gGqGgggggggggggg",
  "gggggggggggggGgg",
  "ggggggggggggGqGg",
  "gggggggggggggggg",
  "gggggggggggggggg",
  "gggggggggGgggggg",
  "ggggggggGqGggggg",
  "gggggggggggggggg"
 ],
 "path": [
  "yyyyyyyyyyyyyyyy",
  "yyyyyyyyyyyyyyyy",
  "yyYyyyyyyyyyzyyy",
  "yyyyyyyyyyyyyyyy",
  "yyyyyyyyyyyyyyyy",
  "yyyyyyzyyyyyyyyy",
  "yyyyyyyyyyyyyyYy",
  "yyyyyyyyyyyyyyyy",
  "yYyyyyyyyyyyyyyy",
  "yyyyyyyyyyzyyyyy",
  "yyyyyyyyyyyyyyyy",
  "yyyyyYyyyyyyyyyy",
  "yyyyyyyyyyyyyyyy",
  "yyyyyyyyyyyyYyyy",
  "yyzyyyyyyyyyyyyy",
  "yyyyyyyyyyyyyyyy"
 ],
 "field": [
  "ffffffffffffffff",
  "ffffFfffffffffff",
  "ffffffffffffgfff",
  "ffffffffffffffff",
  "fffffffffFffffff",
  "fgffffffffffffff",
  "ffffffffffffffFf",
  "ffffffffffffffff",
  "ffffffFfffffffff",
  "ffffffffffffgfff",
  "ffffffffffffffff",
  "fffFffffffffffff",
  "ffffffffffFfffff",
  "ffffffffffffffff",
  "fffffgffffffffff",
  "ffffffffffffffff"
 ],
 "soil_dry": [
  "mmmmmmmmmmmmmmmm",
  "MMMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "MMMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "MMMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm",
  "MMMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmm"
 ],
 "soil_wet": [
  "nnnnnnnnnnnnnnnn",
  "NNNNNNNNNNNNNNNN",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnnnnnnnnnn",
  "NNNNNNNNNNNNNNNN",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnnnnnnnnnn",
  "NNNNNNNNNNNNNNNN",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnnnnnnnnnn",
  "NNNNNNNNNNNNNNNN",
  "nnnnnnnnnnnnnnnn",
  "nnnnnnnnnnnnnnnn"
 ],
 "tree": [
  "................",
  "......DDDD......",
  "....DDLLLLDD....",
  "...DLLLlLLLLD...",
  "..DLLlllLLLLLD..",
  "..DLLLlLLLLLLD..",
  ".DLLLLLLLLlLLLD.",
  ".DLLLLLLLlllLLD.",
  ".DDLLLLLLLlLLDD.",
  "..DDLLLLLLLLDD..",
  "...DDDDLLDDDD...",
  "......tTtt......",
  "......tTtt......",
  "......tTtt......",
  ".....ttTttt.....",
  "................"
 ],
 "fence": [
  "................",
  "................",
  "..RR........RR..",
  "..rR........rR..",
  "RRRRRRRRRRRRRRRR",
  "rrrrrrrrrrrrrrrr",
  "..rR........rR..",
  "..rR........rR..",
  "RRRRRRRRRRRRRRRR",
  "rrrrrrrrrrrrrrrr",
  "..rR........rR..",
  "..rR........rR..",
  "..RR........RR..",
  "................",
  "................",
  "................"
 ],
 "water0": [
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwWWWwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwWWWww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwWWWwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wWWWwwwwwwwwwwww",
  "wwwwwwwwwwwwwWWw",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwvvwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww"
 ],
 "water1": [
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "WWWwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwWWWwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwWWWwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "WWwwwwwwwwwwwwwW",
  "wwwwwwwwwwwWWwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwvvwwwwwwww",
  "wwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwww"
 ],
 "bin": [
  "................",
  "................",
  ".RRRRRRRRRRRRRR.",
  ".RrrrrrrrrrrrrR.",
  ".RrrrrrrrrrrrrR.",
  ".RRRRRRRRRRRRRR.",
  ".RrrrrrrrrrrrrR.",
  ".RraarrrrrraarR.",
  ".RrrrrrrrrrrrrR.",
  ".RRRRRRRRRRRRRR.",
  ".RrrrrrrrrrrrrR.",
  ".RraarrrrrraarR.",
  ".RrrrrrrrrrrrrR.",
  ".RRRRRRRRRRRRRR.",
  "..RR........RR..",
  "................"
 ],
 "seed": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......s...s.....",
  ".....sss.sss....",
  "................",
  "....s.....s.....",
  "...sss...sss....",
  "................"
 ],
 "sprout": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLl.lLl....",
  "......LLLL......",
  ".......DD.......",
  ".......DD.......",
  "......sDDs......"
 ],
 "bokchoy_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLl.lLl....",
  "....lLLLlLLLl...",
  "....LLLLLLLLL...",
  ".....LLLcLLL....",
  "......LcccL.....",
  ".......ccc......",
  ".......ccc......",
  "................"
 ],
 "bokchoy_3": [
  "................",
  "................",
  ".....l....l.....",
  "....lLl..lLl....",
  "...lLLLllLLLl...",
  "...LLLLLLLLLL...",
  "..lLLLLlLLLLLl..",
  "..LLLLLLLLLLLL..",
  "...LLLcLLcLLL...",
  "....LLcccccL....",
  ".....cccccc.....",
  ".....cccccc.....",
  "......cccc......",
  "......cccc......",
  "................",
  "................"
 ],
 "carrot_2": [
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLl.lL.....",
  "......lLlLl.....",
  ".......LLL......",
  "......lLlLl.....",
  ".....lL.L.Ll....",
  "......l.L.l.....",
  ".......LLL......",
  ".......LLL......",
  "......sDDs......",
  "................",
  "................"
 ],
 "carrot_3": [
  "................",
  ".....l...l......",
  "....lLl.lLl.....",
  "..l..lLlLl..l...",
  "..lLl.LLL.lLl...",
  "...lLLlLlLLl....",
  "....lLLLLLl.....",
  ".....lLLLl......",
  "......LLL.......",
  "......LLL.......",
  ".....OOOOO......",
  "....OOOOOOO.....",
  "....OOOOOOO.....",
  ".....OOOOO......",
  "................",
  "................"
 ],
 "strawberry_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......ijL.......",
  ".....LLiLL......",
  "...lLLLLLLLl....",
  "..lLLLiLLLLLl...",
  "..LLLLjiLLLLL...",
  "...LLLLLLLLL....",
  "....LLLLLLL.....",
  "......DDD.......",
  "................",
  "................"
 ],
 "strawberry_3": [
  "................",
  "................",
  "................",
  "......l.l.......",
  ".....lLlLl......",
  "...lLLLLLLLl....",
  "..lLxLLLLLxLl...",
  "..LxXxLLLxXxL...",
  "..LLxLLxLLxLL...",
  "..lLLLxXxLLLl...",
  "...LLLLxLLLL....",
  "....LLLLLLL.....",
  "......DDD.......",
  "................",
  "................",
  "................"
 ],
 "bokchoy_0": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......s...s.....",
  ".....sss.sss....",
  "................",
  "....s.....s.....",
  "...sss...sss....",
  "................"
 ],
 "bokchoy_1": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLl.lLl....",
  "......LLLL......",
  ".......DD.......",
  ".......DD.......",
  "......sDDs......"
 ],
 "carrot_0": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......s...s.....",
  ".....sss.sss....",
  "................",
  "....s.....s.....",
  "...sss...sss....",
  "................"
 ],
 "carrot_1": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLl.lLl....",
  "......LLLL......",
  ".......DD.......",
  ".......DD.......",
  "......sDDs......"
 ],
 "strawberry_0": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......s...s.....",
  ".....sss.sss....",
  "................",
  "....s.....s.....",
  "...sss...sss....",
  "................"
 ],
 "strawberry_1": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLl.lLl....",
  "......LLLL......",
  ".......DD.......",
  ".......DD.......",
  "......sDDs......"
 ],
 "tomato_2": [
  "................",
  "................",
  ".......R........",
  "......lRl.......",
  ".....lLRLl......",
  "....lLLRLLl.....",
  ".....LLRLL......",
  "....lLLRLLl.....",
  "...lLLLRLLLl....",
  "....LLLRLLL.....",
  ".....LLRLL......",
  "......LRL.......",
  ".......R........",
  "......sRs.......",
  "................",
  "................"
 ],
 "tomato_3": [
  "................",
  ".......R........",
  "......lRl.......",
  ".....lLRLl......",
  "...xxLLRLLl.....",
  "..xixxLRLxx.....",
  "..xxXLLRxixx....",
  "...XXLLRxxxX....",
  "...lLLLRLXXl....",
  "..xxLLLRLLxx....",
  ".xixxLLRLxixx...",
  ".xxxX.LRLxxxX...",
  "..XX...R..XX....",
  "......sRs.......",
  "................",
  "................"
 ],
 "corn_2": [
  "................",
  "................",
  "........l.......",
  ".......lL.......",
  ".......LL.......",
  "....l..LL..l....",
  ".....l.LL.l.....",
  "......lLLl......",
  "...l...LL...l...",
  "....ll.LL.ll....",
  "......lLLl......",
  ".......LL.......",
  ".......LL.......",
  "......sDDs......",
  "................",
  "................"
 ],
 "corn_3": [
  ".......A.A......",
  "........A.......",
  "........l.......",
  ".......lL.......",
  "...l...LL...l...",
  "..lAj..LL..jAl..",
  "..ljjl.LL.ljjl..",
  "..ljjl.LL.ljjl..",
  "..ljjl.LL.ljjl..",
  "..lljl.LL.ljll..",
  "...ll.lLLl.ll...",
  ".......LL.......",
  ".......LL.......",
  "......sDDs......",
  "................",
  "................"
 ],
 "watermelon_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l...l.....",
  ".....lLl.lLl....",
  "..l.lLLLlLLLl...",
  ".lLlLLjLLLLLLl..",
  "..LLLDDLLDDLL...",
  "...l.DD..DD.l...",
  "................",
  "................",
  "................"
 ],
 "watermelon_3": [
  "................",
  "................",
  "................",
  "..........l.l...",
  ".........lLlLl..",
  "......QQQQ.LL...",
  "....QlQQlQQl....",
  "...QlQQlQQlQQ...",
  "..QQlQQlQQlQQQ..",
  "..QlQQlQQlQQlQ..",
  "..QlQQlQQlQQlQ..",
  "..QQlQQlQQlQQQ..",
  "...QQlQQlQQlQ...",
  "....QQQQQQQQ....",
  "................",
  "................"
 ],
 "eggplant_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLlLLl.....",
  "....lLLLLLLl....",
  "...lLLLDLuLLl...",
  "....LLLDLLLL....",
  ".....LLDLLL.....",
  "......LDL.......",
  "......sDs.......",
  "................",
  "................"
 ],
 "eggplant_3": [
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLlLLl.....",
  "....lLLLLLLl....",
  "...lLDLLLLDLl...",
  "....LDLLDLDL....",
  "....uUuLDuUu....",
  "....uUULDuUU....",
  "....uUU.DuUU....",
  "....uUU.DuUU....",
  ".....UU.D.UU....",
  "......sDs.......",
  "................",
  "................"
 ],
 "pumpkin_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l...l.....",
  ".....lLl.lLl....",
  "..l.lLLLlLjLl...",
  ".lLlLLLLLLLLLl..",
  "..LLLDDLLDDLL...",
  "...l.DD..DD.l...",
  "................",
  "................",
  "................"
 ],
 "pumpkin_3": [
  "................",
  "................",
  "................",
  "........t.l.....",
  ".......ttlLl....",
  "....OOOPtOOO....",
  "...OOOPOOPOOO...",
  "..OOiOPOOPOOOO..",
  "..OiOOPOOPOOOP..",
  "..OOOOPOOPOOOP..",
  "..OOOOPOOPOOOP..",
  "...OOOPOOPOOP...",
  "....PPPPPPPP....",
  "................",
  "................",
  "................"
 ],
 "sweetpotato_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....l....l.....",
  "....lLl..lLl....",
  "...lLLLllLLLl...",
  "..lLLDLLLLDLLl..",
  "...lLDL..LDLl...",
  "....sDs..sDs....",
  "................",
  "................"
 ],
 "sweetpotato_3": [
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....l....l.....",
  "....lLl..lLl....",
  "...lLLLllLLLl...",
  "..lLLDLLLLDLLl..",
  "....LDL..LDL....",
  "...VVVV..VVV....",
  "..VxVVVVVVVVV...",
  "..VVVVVVVxVVV...",
  "...VVVsVVVVs....",
  "................",
  "................"
 ],
 "cabbage_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......lKKl......",
  "....lKKCCKKl....",
  "...lKKCCCCKKl...",
  "...KKCCCCCCKK...",
  "....KKCCCCKK....",
  ".....lKKKKl.....",
  "................",
  "................"
 ],
 "cabbage_3": [
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  "....lKKllKKl....",
  "...lKKKCCKKKl...",
  "..lKKCCCCCCKKl..",
  "..KKCCCiCCCCKK..",
  ".lKCCCCCCCCCCKl.",
  ".lKCCCCCCCCCCKl.",
  "..KKCCCCCCCCKK..",
  "..lKKKCCCCKKKl..",
  "....lKKKKKKl....",
  "................",
  "................"
 ],
 "radish_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLllLl.....",
  "....lLLLLLLl....",
  ".....lLLLLl.....",
  "......LLLL......",
  ".......LL.......",
  "......iiii......",
  "......sEEs......",
  "................",
  "................"
 ],
 "radish_3": [
  "................",
  ".....l....l.....",
  "....lLl..lLl....",
  "...lLLLllLLLl...",
  "....lLLLLLLl....",
  ".....lLLLLl.....",
  "......lLLl......",
  ".....qiiiiq.....",
  ".....iiiiiiE....",
  ".....iiiiiiE....",
  ".....iiiiiiE....",
  "......iiiiE.....",
  "......iiiiE.....",
  ".......iiE......",
  "........E.......",
  "................"
 ],
 "spinach_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lDllDl.....",
  "....lDDLLDDl....",
  ".....DDLLDD.....",
  "................",
  "................"
 ],
 "spinach_3": [
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......l........",
  "...l...L...l....",
  "...Ll..L..lL....",
  "....LL.L.LL.....",
  ".l..DLLLLLD..l..",
  ".LL.DDLLLDD.LL..",
  "..LLDDDLDDDLL...",
  "...LDDDLDDDL....",
  "....DDDsDDD.....",
  "................",
  "................"
 ],
 "potato_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLllLl.....",
  "....lLLLLLLl....",
  "...lLLLLLLLLl...",
  "....LLLDDLLL....",
  ".....LLDDLL.....",
  "......sDDs......",
  "................",
  "................"
 ],
 "potato_3": [
  "................",
  "................",
  "................",
  "................",
  "......l..l......",
  ".....lLllLl.....",
  "....lLLiLLLl....",
  "...lLLijiLLLl...",
  "....LLLiLDLL....",
  ".....LLDDLL.....",
  "......LDDL......",
  "..YYz..DD..zYY..",
  ".YyYYz.DD.zYyYY.",
  "..YYz.sDDs.zYY..",
  "................",
  "................"
 ],
 "pineapple_2": [
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......L........",
  "...L...L...L....",
  "....L..L..L.....",
  ".L...L.L.L...L..",
  "..L..LLLLL..L...",
  "...LLLLLLLLL....",
  "....LLLLLLL.....",
  ".....LLLLL......",
  "......sDs.......",
  "................",
  "................"
 ],
 "pineapple_3": [
  "......L.L.......",
  ".....L.L.L......",
  "......LLL.......",
  ".....LLLLL......",
  "......LLL.......",
  ".....jHjHj......",
  "....jHjHjHj.....",
  "....HjHjHjH.....",
  "....jHjHjHj.....",
  "....HjHjHjH.....",
  "....jHjHjHj.....",
  ".L...HjHjH...L..",
  "..L.LLLLLLL.L...",
  "...LLLsDsLLL....",
  "................",
  "................"
 ],
 "chicken_0": [
  "................",
  "................",
  "................",
  "..........xx....",
  ".........xxx....",
  ".........iiii...",
  ".........iioiO..",
  "..i......iiiiOO.",
  "..ii....iiiix...",
  "..iii.iiiiii....",
  "...iiiiiiiiiB...",
  "...BiiiiiiiiB...",
  "....BiiiiiBB....",
  ".....BBBBBB.....",
  "......O..O......",
  ".....OO..OO....."
 ],
 "chicken_1": [
  "................",
  "................",
  "................",
  "..........xx....",
  ".........xxx....",
  ".........iiii...",
  ".........iioiO..",
  "..i......iiiiOO.",
  "..ii....iiiix...",
  "..iii.iiiiii....",
  "...iiiiiiiiiB...",
  "...BiiiiiiiiB...",
  "....BiiiiiBB....",
  ".....BBBBBB.....",
  ".....O....O.....",
  "....OO....OO...."
 ],
 "cow_0": [
  "................",
  "................",
  "................",
  "............y.y.",
  "...........oiiio",
  "............ioi.",
  ".o.iiiiooiiiiii.",
  ".oiiiiooooiiIII.",
  "..iiiiiooiiiIoI.",
  "..iiiiiiiiiiIII.",
  "..iiooiiiiiii...",
  "..BiooiiiiiiB...",
  "..ii.ii..ii.ii..",
  "..ii.ii..ii.ii..",
  "..oo.oo..oo.oo..",
  "................"
 ],
 "cow_1": [
  "................",
  "................",
  "................",
  "............y.y.",
  "...........oiiio",
  "............ioi.",
  ".o.iiiiooiiiiii.",
  ".oiiiiooooiiIII.",
  "..iiiiiooiiiIoI.",
  "..iiiiiiiiiiIII.",
  "..iiooiiiiiii...",
  "..BiooiiiiiiB...",
  "...ii.ii.ii..ii.",
  "...ii.ii.ii..ii.",
  "...oo.oo.oo..oo.",
  "................"
 ],
 "egg": [
  "................",
  "................",
  "................",
  "......iiii......",
  ".....iiiiii.....",
  "....iiiiiiiB....",
  "....iiiiiiiB....",
  "...iiiiiiiiiB...",
  "...iiiiiiiiiB...",
  "...iiiiiiiiBB...",
  "...BiiiiiiiBB...",
  "....BiiiiiBB....",
  ".....BBBBBB.....",
  "................",
  "................",
  "................"
 ],
 "egg_l": [
  "..j.............",
  ".jij............",
  "..j...AAAA......",
  ".....AAiAAA.....",
  "....AAiAAAAj....",
  "....AAAAAAAj....",
  "...AAAAAAAAAj...",
  "...AAAAAAAAAj...",
  "...AAAAAAAAjj...",
  "...jAAAAAAAjj...",
  "....jAAAAAjj..j.",
  ".....jjjjjj..jij",
  "..............j.",
  "................",
  "................",
  "................"
 ],
 "milk": [
  "................",
  "......wwww......",
  "......wwww......",
  "......iiii......",
  ".....iiiiii.....",
  "....iiiiiiiB....",
  "....iiiiiiiB....",
  "....iwwwwwiB....",
  "....iwiiiwiB....",
  "....iwwwwwiB....",
  "....iiiiiiiB....",
  "....iiiiiiiB....",
  "....BBBBBBBB....",
  "................",
  "................",
  "................"
 ],
 "milk_l": [
  "..j.............",
  ".jij..jjjj......",
  "..j...jjjj......",
  "......iiii......",
  ".....iiiiii.....",
  "....iiiiiiiB....",
  "....iiiiiiiB....",
  "....ijjjjjiB....",
  "....ijxxxjiB....",
  "....ijjjjjiB....",
  "....iiiiiiiB....",
  "....iiiiiiiB..j.",
  "....BBBBBBBB.jij",
  "..............j.",
  "................",
  "................"
 ],
 "feed": [
  "................",
  "................",
  "......y..y......",
  ".......yy.......",
  "......YyyY......",
  ".....yyyyyy.....",
  "....yyyyyyyy....",
  "....yyjjjjyy....",
  "...yyjjjjjjyy...",
  "...yyyjjjjyyy...",
  "...yyyyyyyyyy...",
  "...Yyyyyyyyyz...",
  "....YYYYYYzz....",
  "................",
  "................",
  "................"
 ],
 "plaza": [
  "JJJJJJJdZZZZZZZd",
  "JJJJJJJdZZZZZZZd",
  "JJJJJJJdZZZZZZZd",
  "JJJJJJJdZZZZZZZd",
  "JJJJJJJdZZZZZZZd",
  "JJJJJJJdZZZZZZZd",
  "JJJJJJJdZZZZZZZd",
  "dddddddddddddddd",
  "ZZZdJJJJJJJdZZZZ",
  "ZZZdJJJJJJJdZZZZ",
  "ZZZdJJJJJJJdZZZZ",
  "ZZZdJJJJJJJdZZZZ",
  "ZZZdJJJJJJJdZZZZ",
  "ZZZdJJJJJJJdZZZZ",
  "ZZZdJJJJJJJdZZZZ",
  "dddddddddddddddd"
 ],
 "flowers": [
  "gggggggggggggggg",
  "ggxggggjgggggIgg",
  "gxjxgggjjggIjIgg",
  "ggxgLgjggggLIgjg",
  "gggLggLgggggLjjj",
  "ggiggggggxgggjgg",
  "gijigggggxjxgggg",
  "ggiLgggIggxggggg",
  "gggLggIjIggLgjgg",
  "ggggggLIggLgjjjg",
  "gxgggggLgggggjgg",
  "xjxggjggggiggLgg",
  "gxggjjjgggijigLg",
  "gLggLjggggLiggLg",
  "gLgggLgggggLgggg",
  "gggggggggggggggg"
 ],
 "board": [
  "................",
  ".RRRRRRRRRRRRRR.",
  ".RrrrrrrrrrrrrR.",
  ".RriiiirjjjjrrR.",
  ".RriaairjaajrrR.",
  ".RriiiirjjjjrrR.",
  ".RriaairrrrrrrR.",
  ".RriiiirIIIIrrR.",
  ".RrrrrrrIaaIrrR.",
  ".RrrrrrrIIIIrrR.",
  ".RrrrrrrrrrrrrR.",
  ".RRRRRRRRRRRRRR.",
  "...RR......RR...",
  "...RR......RR...",
  "...RR......RR...",
  "..ssss....ssss.."
 ],
 "gravel": [
  "yyyyzyyyyyyYyyyy",
  "yYyyyyyyzyyyyyyy",
  "yyyyyyyyyyyyyzyy",
  "yyyzyyYyyyyyyyyy",
  "yyyyyyyyyyyzyyyy",
  "yzyyyyyyyyyyyyYy",
  "yyyyyyzyyYyyyyyy",
  "yyYyyyyyyyyyyyyy",
  "yyyyyyyyyzyyyyzy",
  "yyyzyyyyyyyyyyyy",
  "yyyyyyYyyyyzyyyy",
  "yzyyyyyyyyyyyyyy",
  "yyyyyyyyzyyyYyyy",
  "yyyYyyyyyyyyyyyy",
  "yyyyyyzyyyyyyzyy",
  "yyyyyyyyyyyyyyyy"
 ],
 "cursor": [
  "aaaa........aaaa",
  "a..............a",
  "a..............a",
  "a..............a",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "a..............a",
  "a..............a",
  "a..............a",
  "aaaa........aaaa"
 ],
 "sparkle": [
  "................",
  "................",
  ".......j........",
  "......jij.......",
  ".......j........",
  "................",
  "................",
  "............j...",
  "...........jij..",
  "............j...",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
 ],
 "char_d0": [
  "......oooo......",
  "....oohhhhoo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhkkkkkkhho..",
  "..ohkkkkkkkkho..",
  "..okkekkkkekko..",
  "...okkkkkkkko...",
  "....ookkkkoo....",
  "...oSSSSSSSSo...",
  "..okSSSSSSSSko..",
  "..okSSSSSSSSko..",
  "...oppppppppo...",
  "...oppo..oppo...",
  "...obbo..obbo...",
  "....oo....oo...."
 ],
 "char_d1": [
  "......oooo......",
  "....oohhhhoo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhkkkkkkhho..",
  "..ohkkkkkkkkho..",
  "..okkekkkkekko..",
  "...okkkkkkkko...",
  "....ookkkkoo....",
  "...oSSSSSSSSo...",
  "..okSSSSSSSSko..",
  "..okSSSSSSSSko..",
  "...oppppppppo...",
  "...oppo...opo...",
  "...obbo...obo...",
  "....oo.....o...."
 ],
 "char_u0": [
  "......oooo......",
  "....oohhhhoo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohhhhhhhhhho..",
  "..ohhhhhhhhhho..",
  "...ohhhhhhhho...",
  "....ookkkkoo....",
  "...oSSSSSSSSo...",
  "..okSSSSSSSSko..",
  "..okSSSSSSSSko..",
  "...oppppppppo...",
  "...oppo..oppo...",
  "...obbo..obbo...",
  "....oo....oo...."
 ],
 "char_u1": [
  "......oooo......",
  "....oohhhhoo....",
  "...ohhhhhhhho...",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohhhhhhhhhho..",
  "..ohhhhhhhhhho..",
  "...ohhhhhhhho...",
  "....ookkkkoo....",
  "...oSSSSSSSSo...",
  "..okSSSSSSSSko..",
  "..okSSSSSSSSko..",
  "...oppppppppo...",
  "...opo...oppo...",
  "...obo...obbo...",
  "....o.....oo...."
 ],
 "char_r0": [
  "......oooo......",
  ".....ohhhhoo....",
  "....ohhhhhhho...",
  "....ohhhhhhho...",
  "....ohhkkkkko...",
  "....ohkkkkkkko..",
  "....ohkkkkekko..",
  ".....okkkkkko...",
  "......ookkoo....",
  ".....oSSSSSo....",
  ".....oSSSSSko...",
  ".....oSSSSSko...",
  ".....opppppo....",
  ".....oppopo.....",
  ".....obbobo.....",
  "......oo.oo....."
 ],
 "char_r1": [
  "......oooo......",
  ".....ohhhhoo....",
  "....ohhhhhhho...",
  "....ohhhhhhho...",
  "....ohhkkkkko...",
  "....ohkkkkkkko..",
  "....ohkkkkekko..",
  ".....okkkkkko...",
  "......ookkoo....",
  ".....oSSSSSo....",
  ".....oSSSSSko...",
  ".....oSSSSSko...",
  ".....opppppo....",
  "....oppo.opo....",
  "....obbo.obo....",
  ".....oo...o....."
 ],
 "duck_0": ["................", "................", "................", "................", "..........LLL...", ".........LLLLL..", ".........LLiLOOO", ".........LLLL...", "..B......iiii...", "..BB...iiiiii...", "..BBiiiiiiiii...", "...iiiiiiiiiB...", "....BiiiiiBB....", ".....BBBBBB.....", "......O..O......", ".....OO..OO....."],
 "duck_1": ["................", "................", "................", "................", "..........LLL...", ".........LLLLL..", ".........LLiLOOO", ".........LLLL...", "..B......iiii...", "..BB...iiiiii...", "..BBiiiiiiiii...", "...iiiiiiiiiB...", "....BiiiiiBB....", ".....BBBBBB.....", ".....O....O.....", "....OO....OO...."],
 "sheep_0": ["................", "................", "................", "....BiBiBiB.....", "...BiiiiiiiB....", "..BiiiiiiiiiBoo.", "..iiiiiiiiiiooio", "..BiiiiiiiiiBooo", "..iiiiiiiiiiB.o.", "..BiiiiiiiiiB...", "...BiBiBiBiB....", "....o.o..o.o....", "....o.o..o.o....", "....o.o..o.o....", "................", "................"],
 "sheep_1": ["................", "................", "................", "....BiBiBiB.....", "...BiiiiiiiB....", "..BiiiiiiiiiBoo.", "..iiiiiiiiiiooio", "..BiiiiiiiiiBooo", "..iiiiiiiiiiB.o.", "..BiiiiiiiiiB...", "...BiBiBiBiB....", "...o.o....o.o...", "...o.o....o.o...", "...o.o....o.o...", "................", "................"],
 "dog_0": ["................", "................", "................", "...........nn...", "..........mmmn..", "..........mmom..", "..m.......mmmmo.", "..mm......mmmm..", "...mmmmmmmmmi...", "...mmmmmmmmii...", "...mmmmmmmmm....", "...mm.mm.mm.mm..", "...mm.mm.mm.mm..", "...nn.nn.nn.nn..", "................", "................"],
 "dog_1": ["................", "................", "................", "...........nn...", "..........mmmn..", "..m.......mmom..", "..mm......mmmmo.", "...m......mmmm..", "...mmmmmmmmmi...", "...mmmmmmmmii...", "...mmmmmmmmm....", "..mm..mm.mm..mm.", "..mm..mm.mm..mm.", "..nn..nn.nn..nn.", "................", "................"],
 "cat_0": ["................", "................", "................", "..........O..O..", "..........OOOO..", "..........OoOo..", "..O.......OOiO..", "..O.......OOOO..", "..OO..OPOPOOO...", "...OOOOOOOOOO...", "...OPOPOOOOOi...", "...OOOOOOOOO....", "...OO.OO.OO.OO..", "...ii.ii.ii.ii..", "................", "................"],
 "cat_1": ["................", "................", "................", "..........O..O..", "..........OOOO..", "..O.......OoOo..", "..O.......OOiO..", "...O......OOOO..", "...OO.OPOPOOO...", "...OOOOOOOOOO...", "...OPOPOOOOOi...", "...OOOOOOOOO....", "..OO..OO.OO..OO.", "..ii..ii.ii..ii.", "................", "................"],
 "duck_egg": ["................", "................", "................", "......CCCC......", ".....CCiCCC.....", "....CCiCCCCK....", "....CCCCCCCK....", "...CCCCCCCCCK...", "...CCCCCCCCCK...", "...CCCCCCCCKK...", "...KCCCCCCCKK...", "....KCCCCCKK....", ".....KKKKKK.....", "................", "................", "................"],
 "duck_egg_l": ["..j.............", ".jij............", "..j...CCCC......", ".....CCiCCC.....", "....CCiCCCCK....", "...CCCCCCCCCK...", "...CCCCCCCCCK...", "..CCCCCCCCCCCK..", "..CCCCCCCCCCCK..", "..CCCCCCCCCCKK..", "..KCCCCCCCCCKK..", "...KCCCCCCCKK.j.", "....KKKKKKKK.jij", "..............j.", "................", "................"],
 "wool": ["................", "................", "................", "................", ".....BiiiB......", "....BiiBiiB.....", "...BiiBiiBiB....", "...iiBiiBiiiB...", "...BiiBiiBiiB...", "...BiBiiBiiBB...", "....BiiBiiBB....", ".....BBBBBB.....", "................", "................", "................", "................"],
 "wool_l": ["..j.............", ".jij............", "..j.............", "................", ".....AiiiA......", "....AiiAiiA.....", "...AiiAiiAiA....", "...iiAiiAiiiA...", "...AiiAiiAiiA...", "...AiAiiAiiAA..j", "....AiiAiiAA..ji", ".....AAAAAA....j", "................", "................", "................", "................"]
};

// 四季的景色：只換草地、樹、田埂的顏色（作物和角色不受影響）。
// 春天樹上開粉紅花、秋天樹葉變橘黃、冬天草地結霜、樹梢積雪；夏天就是原本的顏色
export const SEASON_TINT = {
  spring: { g: '#80c95c', G: '#68b44f', q: '#a6dc78', j: '#f59ac0', i: '#ffe3ef', l: '#f7b3cf' },
  summer: {},
  autumn: { g: '#a9b65a', G: '#93a04b', q: '#c9c977', i: '#f4dfae', L: '#d9822b', D: '#a8561f', l: '#f2b33d' },
  winter: { g: '#c4d1bc', G: '#adbda6', q: '#e7eee3', j: '#ffffff', L: '#2f6f48', D: '#204f35', l: '#f2f8fa' },
  // 春天有些樹是櫻花、秋天有些樹是紅楓（畫樹時依位置挑一些用這兩種）
  cherry: { g: '#80c95c', G: '#68b44f', q: '#a6dc78', L: '#f2a3c2', D: '#d27299', l: '#ffd9e8' },
  maple: { g: '#a9b65a', G: '#93a04b', q: '#c9c977', L: '#cc4a2e', D: '#8f2a1d', l: '#ec7b3e' },
  // 村民的髮色（借用同一個換色機制）
  gray: { h: '#c4c4c4' }, brown: { h: '#8a5a32' }, black: {},
};
// 每一季的地面底色（畫面邊緣、房子底下那條草）
export const SEASON_GROUND = { spring: '#68b44f', summer: '#62ad4b', autumn: '#93a04b', winter: '#adbda6' };

const cache = new Map();

// 把一張字串圖畫成 16×16 的小畫布（同一張圖、同一件衣服顏色、同一季只畫一次）
export function sprite(name, shirt = '#d9544d', flip = false, season = '') {
  if (/@q[123]$/.test(name)) return qualitySprite(name.slice(0, -3), Number(name.slice(-1)));
  if (name.startsWith('fert_')) return fertSprite(name.slice(5));
  if (name.startsWith('fertdots_')) return fertDotsSprite(name.slice(9));
  if (name.startsWith('gear_')) return gearSprite(name.slice(5));
  if (name === 'crow') return crowSprite();
  if (name === 'horse_0' || name === 'horse_1') return horseSprite(Number(name.slice(6)), flip);
  if (name.startsWith('familyboard_')) return familyBoardSprite(Number(name.slice(12)) || 0);
  if (/^rice_[0-3]$/.test(name)) return riceSprite(Number(name.slice(5))); // 稻子用程式畫（倉庫、商店的圖示）
  if (name === 'spray') return spraySprite();
  if (name.startsWith('fish_')) return fishSprite(name.slice(5));
  if (name.startsWith('ore_')) return oreSprite(name.slice(4));
  if (name.startsWith('dish_')) { const [id, shape] = name.slice(5).split('@'); return dishSprite(id, shape); }
  if (name.startsWith('good_')) return goodSprite(name.slice(5));
  if (name.startsWith('fruit_')) return fruitSprite(name.slice(6));
  if (name.startsWith('forage_')) return forageSprite(name.slice(7));
  if (name.startsWith('bug_')) return bugSprite(name.slice(4), 0);
  if (name.startsWith('deco_')) return decoSprite(name.slice(5));
  if (name.startsWith('tree_')) { const [, kind, stage, ripe] = name.split('_'); return fruitTreeSprite(kind, Number(stage), ripe === 'r'); }
  if (name === 'honey' || name === 'honey_l') return honeySprite(name);
  const art = artSprite(name, shirt, flip, season); // 已經換成 32×32 的圖（地面、田、作物、人物、動物、樹）
  if (art) return art;
  const key = name + '|' + shirt + '|' + (flip ? 1 : 0) + '|' + season;
  if (cache.has(key)) return cache.get(key);
  const rows = SPRITES[name];
  const tint = SEASON_TINT[season] || {};
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = rows[y][flip ? 15 - x : x];
      if (ch === '.') continue;
      const col = tint[ch] || PALETTE[ch];
      g.fillStyle = col === 'SHIRT' ? shirt : col;
      g.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

// 魚、礦石：同一個形狀換顏色。1 身體、2 肚子（礦石是礦脈的斑點）、3 鰭／陰影、4 亮面、o 眼睛
export const FISH_SHAPE = ["................", "................", "................", ".....3333.......", "...111111111....", "..1o1111111111.3", ".111111111111133", ".122222222211133", "..2222222222113.", "...222222221113.", ".....3...3......", "................", "................", "................", "................", "................"];
export const BOOT_SHAPE = ["................", "................", "....11111.......", "....12221.......", "....12221.......", "....12221.......", "....12221.......", "....122211......", "....1222211111..", "....12222222221.", "....12222222221.", "....33333333333.", "................", "................", "................", "................"];
export const ROCK_SHAPE = ["................", "................", "................", "................", "......4444......", "....44111111....", "...4111211111...", "..411111112113..", "..112111111113..", ".11111121111133.", ".11211111121133.", ".13111111111333.", "..333111113333..", "...3333333333...", "................", "................"];
export const FISH_COLORS = {
  tilapia: ['#6b7a8f', '#c9d1db', '#4b586b'],
  crucian: ['#9a8a5a', '#e2d6a8', '#6e6240'],
  catfish: ['#5a4e44', '#a89a8a', '#3a322c'],
  carp: ['#e07a2e', '#f6e2b8', '#b85a1c'],
  sweetfish: ['#8fb3a0', '#eef4ea', '#5e8a74'],
  bass: ['#7d8c6a', '#d9dfc8', '#55613f'],
  goldfish: ['#f28b2c', '#f6d34a', '#e0393e'],
  eel: ['#3d4a3a', '#8f9a6e', '#262e24'],
  junk: ['#6b4a2b', '#8d6a45', '#3a2818'],
  mackerel: ['#3d6e8f', '#e8eef2', '#24465e'],
  porgy: ['#3a3a40', '#9a9aa4', '#22222a'],
  saury: ['#5a7ea8', '#eef2f6', '#2e4a6e'],
  hairtail: ['#c9d1db', '#f4f6f8', '#8a96a4'],
  squid: ['#e8b4a0', '#f6e2d8', '#c87a64'],
  mullet: ['#7a8a96', '#dfe4e8', '#4e5a64'],
  octopus: ['#c8553d', '#e8917a', '#8a3424'],
  mahi: ['#3fae6a', '#f6d34a', '#2e7a4a'],
  grouper: ['#8a5a3a', '#c98a5a', '#5e3b20'],
  tuna: ['#1e2e4a', '#b8c4d4', '#121c30'],
};
// 小卷、章魚不是魚的形狀
export const SQUID_SHAPE = ["................", "......1111......", ".....111111.....", ".....1o11o1.....", ".....111111.....", ".....122221.....", ".....122221.....", ".....122221.....", ".....122221.....", "......1221......", ".....3.33.3.....", "....3..33..3....", "....3..3...3....", "...3...3....3...", "................", "................"];
export const OCTO_SHAPE = ["................", "................", ".....111111.....", "....11111111....", "...1111111111...", "...11o1111o11...", "...1111111111...", "...1222222221...", "....12222221....", "...1.1.11.1.1...", "..1..1.11.1..1..", "..3..3.33.3..3..", ".3..3..3..3..3..", "................", "................", "................"];
export const ORE_COLORS = {
  stone: ['#a4a09a', '#8a8680', '#6e6a64', '#c9c5bf'],
  copper: ['#a4a09a', '#d9822b', '#6e6a64', '#c9c5bf'],
  silver: ['#a4a09a', '#eef2f6', '#6e6a64', '#c9c5bf'],
  gold: ['#a4a09a', '#f6d34a', '#6e6a64', '#c9c5bf'],
  amethyst: ['#8f8aa0', '#b56ee0', '#5e5872', '#d6c9ee'],
  jade: ['#8a9a88', '#3fae6a', '#5e6e5c', '#bfe6c9'],
  ruby: ['#a09090', '#e0303e', '#6e5a5a', '#f6b6c0'],
  sapphire: ['#9098a8', '#3a6fe0', '#5a6272', '#b6cdf6'],
  diamond: ['#a4a8b0', '#e8fbff', '#6e727a', '#ffffff'],
};
function shaped(key, shape, colors) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const map = { 1: colors[0], 2: colors[1], 3: colors[2], 4: colors[3] || colors[0], o: '#2b2421' };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const col = map[shape[y][x]];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  cache.set(key, c);
  return c;
}
// 料理：盤子（3 盤子、4 陰影）、碗（4 是碗上的藍色花紋）、杯子（4 是吸管），1、2 是菜的顏色
export const DISH_SHAPES = { plate: ["................", "................", "................", "................", "................", "......1121......", "....11211211....", "...1121112111...", "..112111121112..", ".33333333333333.", ".43333333333334.", "..444444444444..", "................", "................", "................", "................"], bowl: ["................", "................", "................", "................", "....11211211....", "..112111121111..", ".33333333333333.", ".34444444444443.", "..333333333333..", "...3333333333...", "....33333333....", ".....444444.....", "................", "................", "................", "................"], cup: ["................", "..........4.....", ".........4......", "....33334333....", "....31141113....", "....31411113....", "....31111113....", "....31212123....", "....31111113....", "....31111113....", ".....311113.....", ".....311113.....", ".....333333.....", "................", "................", "................"] };
export const DISH_COLORS = {"stirfry": ["#4f9d3f", "#8fd16a"], "tomato_egg": ["#e0393e", "#f6d34a"], "carrot_egg": ["#f28b2c", "#f6d34a"], "eggplant": ["#7b3fa0", "#c8553d"], "potato_salad": ["#f2e2a0", "#f6d34a"], "corn_grill": ["#f2b33d", "#8d5d32"], "cabbage_rice": ["#f4f1e8", "#9dd17a"], "sweetpotato_congee": ["#f4efe0", "#e8913a"], "radish_soup": ["#e9e4c8", "#ffffff"], "pumpkin_soup": ["#f2a03a", "#ffffff"], "fish_braised": ["#8a4a2a", "#c96a3a"], "bass_soup": ["#e8e4d0", "#d9b44a"], "eel_rice": ["#6b3a1e", "#f4f1e8"], "pudding": ["#f6d880", "#8d5d32"], "strawberry_milk": ["#f6b6c9", "#e0393e"], "watermelon_juice": ["#f05a5a", "#4f9d3f"], "pineapple_cake": ["#e8b45a", "#f6d34a"], "niangao": ["#c98a3a", "#e8b45a"], "tangyuan": ["#f4f1e8", "#f6b6c9"], "zongzi": ["#4f7d3a", "#8fb35a"], "mooncake": ["#c98a3a", "#8d5d32"], "candy": ["#e0393e", "#f6d34a"], "cake": ["#f6efe0", "#e0393e"], "caipu_egg": ["#f6d34a", "#c98a3a"], "kimchi_pot": ["#e05a3a", "#f6d880"], "cheese_potato": ["#f6d34a", "#e8913a"], "pancake": ["#e8b45a", "#d9344a"], "fries": ["#f2c94a", "#d9344a"], "corn_salad": ["#f6d34a", "#f6efc8"], "golden_pumpkin": ["#f2a03a", "#f6d34a"], "bbq": ["#8d4a2a", "#f2b33d"], "mango_ice": ["#f2b33d", "#f4f1e8"], "orange_juice": ["#f28b2c", "#f8b860"], "honey_potato": ["#e8913a", "#c87a1e"], "honey_cake": ["#e8b45a", "#8d5d32"], "saury_grill": ["#5a7ea8", "#e8913a"], "clam_soup": ["#f4efe0", "#d9b44a"], "squid_sanbei": ["#c87a3a", "#4f9d3f"], "hairtail_sweet": ["#e05a3a", "#f4f6f8"], "seafood_congee": ["#f4efe0", "#e0393e"], "karasumi": ["#e8913a", "#c8553d"], "tuna_sashimi": ["#d9344a", "#f6b6c9"], "bamboo_soup": ["#f4efe0", "#e8d29a"], "fern_stirfry": ["#2e7a2e", "#5fbf5f"], "shiitake_egg": ["#f6d880", "#7a4e2d"], "chestnut_roast": ["#7a4e2d", "#c98a3a"], "woodear_drink": ["#5a4038", "#d9b98a"], "lingzhi_tea": ["#8a3a24", "#c8553d"], "fried_rice": ["#f6d880", "#f2b33d"], "veg_rice": ["#f4efe0", "#4f9d3f"], "oil_rice": ["#8a5a28", "#c98a5a"], "rice_ball": ["#f4efe0", "#c98a3a"], "oolong_honey": ["#c98a3a", "#f2c84a"], "milk_tea": ["#d9b98a", "#f4efe0"]};
const DISH_KIND = { plate: ['#f4f1ea', '#c9c5bf'], bowl: ['#f4f1ea', '#5a8fc8'], cup: ['#d9eef6', '#e0393e'] };
export const dishSprite = (id, shape = 'plate') => shaped('dish_' + id, DISH_SHAPES[shape] || DISH_SHAPES.plate,
  [...(DISH_COLORS[id] || ['#c8553d', '#f6d34a']), ...(DISH_KIND[shape] || DISH_KIND.plate)]);
export const fishSprite = (id) => shaped('fish_' + id, id === 'junk' ? BOOT_SHAPE : id === 'squid' ? SQUID_SHAPE : id === 'octopus' ? OCTO_SHAPE : FISH_SHAPE,
  FISH_COLORS[id] || FISH_COLORS.tilapia);
export const oreSprite = (id) => shaped('ore_' + id, ROCK_SHAPE, ORE_COLORS[id] || ORE_COLORS.stone);

// 作物某個階段的圖：種子、發芽兩個階段每種作物長得一樣，共用小白菜那兩張
export function cropSprite(crop, stage) {
  if (crop === 'rice') return riceSprite(Math.max(0, stage));
  const name = `${crop}_${stage}`;
  if (SPRITES[name]) return sprite(name);
  return sprite(stage <= 1 ? `bokchoy_${Math.max(0, stage)}` : 'bokchoy_3');
}
export const hasCropArt = (crop) => crop === 'rice' || !!SPRITES[`${crop}_3`];

// 房子（4×3 格 = 64×48）：紅屋頂、米色牆、木門、兩扇窗、煙囪。
// 擴建過的房子：大臥室（窗台多了花箱、門口有燈），二樓（屋頂上多一扇老虎窗、門變成藍色）
export function houseSprite(ground = '#62ad4b', level = 1) {
  const ck = 'house|' + ground + '|' + level;
  if (cache.has(ck)) return cache.get(ck);
  const c = document.createElement('canvas');
  c.width = 64; c.height = 48;
  const g = c.getContext('2d');
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  r('#7a4e2d', 46, 2, 6, 10);                        // 煙囪
  for (let i = 0; i < 20; i++) r(i % 4 === 3 ? '#a8432f' : '#c8553d', 2 + i, 22 - i, 60 - 2 * i, 1); // 屋頂
  r('#8f3424', 0, 22, 64, 2);                         // 屋簷
  r('#f2e2c4', 4, 24, 56, 24);                        // 牆
  r('#d9c6a2', 4, 24, 56, 2);
  r('#7a4e2d', 26, 30, 12, 18);                       // 門
  r('#5e3b20', 26, 30, 12, 2); r('#f6d34a', 35, 39, 2, 2);
  for (const wx of [10, 44]) { r('#5e3b20', wx - 1, 29, 12, 10); r('#9ad6f6', wx, 30, 10, 8); r('#ffffff', wx + 1, 31, 3, 2); r('#5e3b20', wx + 4, 30, 1, 8); }
  if (level >= 2) {
    for (const wx of [10, 44]) {                                   // 花箱
      r('#8d5d32', wx - 1, 39, 12, 3);
      for (let i = 0; i < 5; i++) r(i % 2 ? '#f6d34a' : '#e0393e', wx + i * 2, 37, 2, 2);
      r('#4f9d3f', wx, 38, 10, 1);
    }
    r('#f6d34a', 40, 31, 2, 3); r('#5e3b20', 40, 30, 2, 1);        // 門燈
  }
  if (level >= 3) {
    r('#3b6ea8', 26, 30, 12, 18); r('#2f5a8a', 26, 30, 12, 2); r('#f6d34a', 35, 39, 2, 2); // 藍色的門
    for (let i = 0; i < 6; i++) r('#a8432f', 25 + i, 8 - i + 6, 14 - 2 * i, 1);         // 老虎窗的小屋頂
    r('#f2e2c4', 26, 14, 12, 8); r('#5e3b20', 28, 15, 8, 6); r('#9ad6f6', 29, 16, 6, 4); r('#ffffff', 30, 16, 2, 1);
  }
  r(ground, 4, 46, 56, 2);
  cache.set(ck, c);
  return c;
}

// 動物小屋（4×3 格 = 64×48）：紅色穀倉、白邊、大門上有白色 X、上面有放乾草的小窗
export function barnSprite(ground = '#62ad4b') {
  if (cache.has('barn|' + ground)) return cache.get('barn|' + ground);
  const c = document.createElement('canvas');
  c.width = 64; c.height = 48;
  const g = c.getContext('2d');
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (let i = 0; i < 14; i++) r(i % 3 === 2 ? '#5e2219' : '#7a2e22', 18 - i, 2 + i, 28 + 2 * i, 1);   // 屋頂
  r('#5e2219', 2, 16, 60, 2);
  r('#b8432f', 4, 18, 56, 28);                                                                        // 牆
  for (let x = 8; x < 60; x += 6) r('#a33a28', x, 18, 1, 28);                                         // 木板紋
  r('#ffffff', 4, 18, 56, 1); r('#ffffff', 4, 18, 1, 28); r('#ffffff', 59, 18, 1, 28);              // 白邊
  r('#ffffff', 26, 6, 12, 9); r('#e8c26a', 27, 7, 10, 7); r('#c99a2e', 27, 11, 10, 3);              // 乾草窗
  r('#ffffff', 21, 26, 22, 20); r('#8f2a1d', 23, 28, 18, 18);                                         // 大門
  for (let i = 0; i < 18; i++) { r('#ffffff', 23 + i, 28 + i, 1, 1); r('#ffffff', 40 - i, 28 + i, 1, 1); }
  r('#ffffff', 31, 28, 2, 18);
  r(ground, 4, 46, 17, 2); r(ground, 43, 46, 17, 2);
  cache.set('barn|' + ground, c);
  return c;
}

// 小鎮的大建築都用程式畫：雜貨店、小吃店（4×3 格）、民宅（3×2 格）、噴水池（2×2 格）
function building(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw((col, x, y, ww, hh) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); });
  cache.set(key, c);
  return c;
}
// ---------------- 冬天的雪（第二十六期） ----------------
// 下雪的草地：白白的，露出一點點草尖（三種，排起來比較自然）
export const snowCoverSprite = (v = 0) => building('snowcover_' + v, 16, 16, (r) => {
  r('#eef3f8', 0, 0, 16, 16); r('#dde7f1', 0, 13, 16, 3);
  for (const [x, y] of [[[3, 4], [11, 9], [6, 12]], [[9, 3], [2, 10], [13, 13]], [[5, 7], [12, 4], [8, 14]]][v % 3]) { r('#7fae5a', x, y, 1, 2); r('#ffffff', x - 1, y - 1, 3, 1); }
});
// 樹頂積雪
export const snowCapSprite = () => building('snowcap', 16, 16, (r) => {
  r('#f4f8fc', 3, 1, 10, 2); r('#ffffff', 5, 0, 6, 1); r('#f4f8fc', 2, 3, 3, 1); r('#f4f8fc', 11, 3, 3, 1); r('#dde7f1', 4, 3, 8, 1);
});
// 後山的雪人小丘：沒下雪的時候是一塊小木牌；下雪的時候是雪堆，堆了幾段就畫幾段（16×24，往上多畫 8 格）
export const snowmanSprite = (snowy, parts = 0, nose = false) => building(`snowman_${snowy ? 1 : 0}_${parts}_${nose ? 1 : 0}`, 16, 24, (r) => {
  if (!snowy) { r('#8d5d32', 7, 15, 2, 9); r('#a8743f', 3, 10, 10, 6); r('#5e3b20', 3, 15, 10, 1); r('#ffffff', 7, 11, 2, 4); r('#ffffff', 6, 12, 4, 2); return; }
  if (parts < 1) { r('#e4ecf4', 2, 19, 12, 5); r('#ffffff', 4, 17, 8, 3); return; }
  r('#ffffff', 3, 15, 10, 8); r('#ffffff', 4, 14, 8, 1); r('#dfe8f2', 3, 21, 10, 2); r('#e4ecf4', 2, 22, 12, 2);
  if (parts >= 2) { r('#ffffff', 4, 9, 8, 6); r('#ffffff', 5, 8, 6, 1); r('#2b2421', 7, 11, 2, 1); r('#2b2421', 7, 13, 2, 1); }
  if (parts >= 3) {
    r('#ffffff', 5, 3, 6, 5); r('#2b2421', 6, 5, 1, 1); r('#2b2421', 9, 5, 1, 1); r('#2b2421', 7, 7, 2, 1);
    r('#c8302e', 5, 1, 6, 2); r('#f6d34a', 7, 0, 2, 1); r('#3b6ea8', 4, 8, 8, 1); r('#3b6ea8', 10, 9, 2, 3);
    r('#8d5d32', 1, 10, 3, 1); r('#8d5d32', 12, 10, 3, 1);
    if (nose) r('#f08a3a', 8, 6, 3, 1);
  }
});

// 房子旁邊的信箱：木頭柱子、紅色的信箱；有新信的時候小紅旗豎起來
export const mailboxSprite = (up) => building('mailbox_' + (up ? 1 : 0), 16, 16, (r) => {
  r('#5e3b20', 7, 9, 2, 7); r('#3a2818', 6, 15, 4, 1);
  r('#b8442e', 3, 3, 10, 7); r('#d9583e', 3, 3, 10, 2); r('#8d2e20', 3, 9, 10, 1); r('#2b2421', 5, 6, 6, 1);
  if (up) { r('#f6d34a', 13, 0, 1, 7); r('#e0393e', 13, 0, 3, 3); } else { r('#f6d34a', 13, 6, 3, 1); r('#e0393e', 14, 6, 2, 2); }
});

// ---------------- 昆蟲（第二十四期） ----------------
// 蝴蝶：翅膀上半 c1、下半 c2，張開（f=0）、收一半（f=1）；deco 畫翅膀上的花紋
const butterfly = (c1, c2, deco, tail) => (r, f) => {
  const w = f ? 3 : 5, l = 7 - w, rr = 9;
  r(c1, l, 4, w, 4); r(c1, rr, 4, w, 4); r(c2, l + 1, 8, w - 1, 3); r(c2, rr, 8, w - 1, 3);
  if (tail) { r(c2, l + 1, 11, 1, 2); r(c2, rr + w - 2, 11, 1, 2); }
  if (deco) deco(r, l, rr, w);
  r('#2b2421', 7, 4, 2, 8); r('#2b2421', 6, 2, 1, 2); r('#2b2421', 9, 2, 1, 2);
};
const dragonfly = (c) => (r, f) => {
  const wy = f ? 1 : 0, wing = '#cfe8f6';
  r(wing, 1, 4 + wy, 6, 2); r(wing, 9, 4 + wy, 6, 2); r(wing, 2, 7 - wy, 5, 2); r(wing, 9, 7 - wy, 5, 2);
  r(c, 7, 3, 2, 11); r(c, 6, 2, 4, 2); r('#2b2421', 6, 2, 1, 1); r('#2b2421', 9, 2, 1, 1);
};
const legs = (r, f, c = '#2b2421', y = 8) => { const d = f ? 1 : 0; r(c, 3, y + d, 2, 1); r(c, 11, y + d, 2, 1); r(c, 3, y + 3 - d, 2, 1); r(c, 11, y + 3 - d, 2, 1); };
const BUG_ART = {
  cabbage_white: butterfly('#f4f1e8', '#e8e4dc', (r, l, rr, w) => { r('#2b2421', l + 1, 5, 1, 1); r('#2b2421', rr + w - 2, 5, 1, 1); }),
  yellow_butterfly: butterfly('#f6d34a', '#f2c94a', (r, l, rr, w) => { r('#c98a2a', l, 4, 1, 1); r('#c98a2a', rr + w - 1, 4, 1, 1); }),
  swallowtail: butterfly('#2b2421', '#2b2421', (r, l, rr, w) => { r('#f6d34a', l + 1, 5, w - 2, 1); r('#f6d34a', rr + 1, 5, w - 2, 1); r('#4aa3df', l + 1, 9, 1, 1); r('#4aa3df', rr + w - 2, 9, 1, 1); }, true),
  broadtail: butterfly('#1e1a18', '#1e1a18', (r, l, rr, w) => { r('#f4f1e8', l + 1, 8, w - 2, 2); r('#f4f1e8', rr, 8, w - 2, 2); r('#e0393e', l + 1, 10, 1, 1); r('#e0393e', rr + w - 3, 10, 1, 1); }, true),
  leaf_butterfly: butterfly('#a8743f', '#8d5d32', (r, l, rr, w) => { r('#e0763a', l + 1, 5, w - 1, 1); r('#e0763a', rr, 5, w - 1, 1); r('#5e3b20', l, 9, w, 1); r('#5e3b20', rr, 9, w - 1, 1); }),
  purple_crow: butterfly('#4a2f6e', '#3a2358', (r, l, rr, w) => { r('#9a7ad6', l + 1, 5, 2, 1); r('#9a7ad6', rr + 1, 5, 2, 1); r('#f4f1e8', l, 9, 1, 1); r('#f4f1e8', rr + w - 2, 9, 1, 1); }),
  atlas_moth: (r, f) => {
    const w = f ? 5 : 7;
    r('#b5532e', 8 - w - 1, 3, w, 5); r('#b5532e', 9, 3, w, 5); r('#8d3a1e', 8 - w, 8, w - 1, 5); r('#8d3a1e', 9, 8, w - 1, 5);
    r('#f4f1e8', 8 - w + 1, 5, 2, 2); r('#f4f1e8', 9 + w - 3, 5, 2, 2); r('#f6d34a', 8 - w - 1, 3, 1, 1); r('#f6d34a', 9 + w - 1, 3, 1, 1);
    r('#5e3b20', 7, 4, 2, 8); r('#c9a96a', 6, 2, 1, 2); r('#c9a96a', 9, 2, 1, 2);
  },
  dragonfly: dragonfly('#3f8ad6'),
  red_dragonfly: dragonfly('#e0393e'),
  ladybug: (r, f) => { legs(r, f, '#2b2421', 7); r('#e0393e', 4, 5, 8, 7); r('#c8302e', 4, 11, 8, 1); r('#2b2421', 7, 5, 2, 7); r('#2b2421', 5, 7, 2, 2); r('#2b2421', 10, 8, 1, 2); r('#2b2421', 5, 10, 1, 1); r('#2b2421', 5, 3, 6, 2); r('#f4f1e8', 6, 3, 1, 1); },
  cicada: (r, f) => { r('#cfe8f6', 3, 6, 4, 8); r('#cfe8f6', 9, 6, 4, 8); r('#8a9a9a', 3, 6, 1, 8); r('#8a9a9a', 12, 6, 1, 8); r('#5e5a3a', 6, 4, 4, 9); r('#3a3826', 5, 3, 6, 2); r('#c9302e', 5, 3, 1, 1); r('#c9302e', 10, 3, 1, 1); if (f) r('#f4f1e8', 4, 7, 1, 1); },
  longhorn: (r, f) => { legs(r, f); r('#1e1a18', 6, 5, 4, 8); r('#f4f1e8', 7, 7, 1, 1); r('#f4f1e8', 8, 10, 1, 1); r('#1e1a18', 6, 3, 4, 2);
    r('#1e1a18', 5, 2, 1, 1); r('#1e1a18', 4, 1, 1, 1); r('#1e1a18', 3, 0, 1, 1); r('#1e1a18', 10, 2, 1, 1); r('#1e1a18', 11, 1, 1, 1); r('#1e1a18', 12, 0, 1, 1); },
  mantis: (r, f) => { r('#5fae3f', 7, 4, 2, 10); r('#5fae3f', 6, 2, 4, 2); r('#2b2421', 6, 2, 1, 1); r('#2b2421', 9, 2, 1, 1);
    r('#4a8f2f', f ? 4 : 5, 5, 3, 1); r('#4a8f2f', 9, 5, f ? 3 : 2, 1); r('#4a8f2f', 5, 6, 1, 2); r('#4a8f2f', 10, 6, 1, 2); r('#4a8f2f', 5, 11, 2, 1); r('#4a8f2f', 9, 11, 2, 1); r('#8fd06a', 7, 8, 2, 4); },
  firefly: (r, f) => { r('#2b2421', 7, 5, 2, 5); r('#c9302e', 7, 4, 2, 1); r('#cfe8f6', f ? 5 : 4, 6, 2, 3); r('#cfe8f6', f ? 9 : 10, 6, 2, 3); r(f ? '#f6ff8a' : '#e8f67a', 7, 10, 2, 3); },
  rhino_beetle: (r, f) => { legs(r, f, '#2b2421', 8); r('#5e3b20', 4, 6, 8, 8); r('#7a4e2d', 5, 7, 2, 4); r('#3a2818', 7, 6, 1, 8);
    r('#3a2818', 5, 3, 6, 3); r('#3a2818', 7, 0, 2, 4); r('#3a2818', 6, 0, 1, 1); r('#3a2818', 9, 0, 1, 1); },
  stag_beetle: (r, f) => { legs(r, f, '#2b2421', 8); r('#2b2421', 4, 6, 8, 8); r('#4a3a30', 5, 7, 2, 4); r('#1e1a18', 7, 6, 1, 8);
    r('#2b2421', 5, 4, 6, 2); r('#2b2421', 4, 1, 1, 4); r('#2b2421', 11, 1, 1, 4); r('#2b2421', 5, 1, 1, 1); r('#2b2421', 10, 1, 1, 1); },
  katydid: (r, f) => { r('#7ab83f', 5, 4, 6, 9); r('#5e9a2a', 5, 4, 1, 9); r('#5e9a2a', 6, 3, 4, 2); r('#2b2421', 6, 3, 1, 1); r('#2b2421', 9, 3, 1, 1);
    r('#4a8f2f', 3, f ? 10 : 11, 2, 3); r('#4a8f2f', 11, f ? 10 : 11, 2, 3); r('#5e9a2a', 6, 0, 1, 3); r('#5e9a2a', 9, 0, 1, 3); },
  cricket: (r, f) => { r('#3a2818', 5, 5, 6, 8); r('#5e3b20', 6, 6, 4, 6); r('#2b2421', 6, 3, 4, 2); r('#2b2421', 5, 1, 1, 3); r('#2b2421', 10, 1, 1, 3);
    r('#2b2421', 3, f ? 10 : 11, 2, 3); r('#2b2421', 11, f ? 10 : 11, 2, 3); },
  hermit_crab: (r, f) => { r('#e8d29a', 6, 4, 7, 7); r('#c9a96a', 7, 5, 4, 4); r('#e8d29a', 8, 6, 2, 2); r('#a8743f', 6, 10, 7, 1);
    r('#e0763a', 3, f ? 7 : 8, 3, 3); r('#e0763a', 4, 11, 1, 2); r('#e0763a', 6, 11, 1, 2); r('#2b2421', 4, f ? 6 : 7, 1, 1); },
  snail: (r, f) => { r('#d8c8a8', 2 + (f ? 1 : 0), 11, 11, 2); r('#d8c8a8', 2 + (f ? 1 : 0), 8, 2, 3); r('#2b2421', 2 + (f ? 1 : 0), 7, 1, 1);
    r('#c98a3a', 6, 4, 7, 7); r('#8d5d32', 8, 6, 3, 3); r('#c98a3a', 9, 7, 1, 1); r('#8d5d32', 6, 4, 7, 1); },
};
export const BUG_IDS = Object.keys(BUG_ART);
export const bugSprite = (id, f = 0) => building(`bug_${id}_${f ? 1 : 0}`, 16, 16, (r) => (BUG_ART[id] || BUG_ART.cabbage_white)(r, f ? 1 : 0));

// 阿鐵師傅的鐵匠鋪（2×2 格）：石頭牆、深紅瓦屋頂、冒煙的煙囪、門裡的爐火一閃一閃、門口的鐵砧
export const smithSprite = (f = 0) => building('smith_' + f, 32, 32, (r) => {
  r('#5e5a54', 23, 2, 5, 6); r('#46423e', 22, 2, 7, 1);                                   // 煙囪
  r('#d8d4cc', f ? 24 : 25, 0, 3, 2); r('#c9c5bf', f ? 27 : 22, f ? 0 : 1, 2, 1);          // 冒煙
  r('#9a4a36', 6, 4, 16, 2); r('#7a3a2a', 2, 6, 28, 5); r('#9a4a36', 2, 6, 28, 1); r('#5e2a1e', 1, 11, 30, 1); // 屋頂
  r('#9c968b', 2, 12, 28, 17);                                                             // 石頭牆
  for (const [x, y, w] of [[3, 13, 5], [10, 14, 4], [22, 13, 6], [4, 20, 4], [24, 19, 4], [3, 25, 6], [22, 24, 3]]) r('#7e786e', x, y, w, 2);
  r('#2b2421', 12, 16, 9, 13); r('#5e3b20', 11, 15, 11, 1);                               // 門口
  r(f ? '#f6a04a' : '#e0763a', 13, 22, 7, 6); r(f ? '#f6d34a' : '#f6b04a', 15, 24, 3, 3); // 爐火
  r('#8d5d32', 3, 15, 7, 5); r('#c9c5bf', 4, 16, 5, 1); r('#5e3b20', 6, 17, 1, 3);         // 招牌：一把鐵鎚
  r('#5e5e66', 23, 23, 7, 1); r('#3a3a40', 23, 24, 7, 2); r('#3a3a40', 25, 26, 3, 2); r('#2b2b30', 23, 28, 7, 1); // 鐵砧
  r('#6e6a64', 1, 29, 30, 1);
});
// 阿福伯的雜貨店：綠色遮雨棚、木頭招牌、玻璃櫥窗裡擺著鋤頭和澆水壺
export const storeSprite = () => building('store', 64, 48, (r) => {
  r('#7a4e2d', 2, 4, 60, 3); r('#8d5d32', 4, 7, 56, 3);                       // 屋簷
  r('#e8dcc0', 4, 10, 56, 38); r('#d4c4a0', 4, 10, 56, 2);                    // 牆
  r('#f6d34a', 14, 0, 36, 7); r('#8d5d32', 14, 0, 36, 1); r('#8d5d32', 14, 6, 36, 1); // 招牌
  for (let x = 17; x < 48; x += 4) r('#7a4e2d', x, 2, 2, 3);
  for (let i = 0; i < 14; i++) r(i % 2 ? '#ffffff' : '#3f9a3f', 4 + i * 4, 12, 4, 6); // 遮雨棚
  r('#2b7a33', 4, 18, 56, 1);
  r('#5e3b20', 7, 22, 22, 18); r('#bfe6f6', 8, 23, 20, 16);                   // 櫥窗
  r('#8d5d32', 11, 28, 2, 10); r('#9aa3a8', 9, 27, 6, 2);                     // 鋤頭
  r('#4aa3df', 19, 31, 7, 6); r('#4aa3df', 25, 30, 3, 2); r('#3487c6', 19, 36, 7, 1); // 澆水壺
  r('#7a4e2d', 38, 24, 16, 24); r('#5e3b20', 38, 24, 16, 2); r('#f6d34a', 50, 36, 2, 2); // 門
  r('#62ad4b', 4, 46, 34, 2);
});
// 美玲姐的小吃店：紅燈籠、紅色布簾、店門口的蒸籠
export const eaterySprite = () => building('eatery', 64, 48, (r) => {
  r('#5e2219', 2, 4, 60, 4); r('#7a2e22', 4, 8, 56, 3);
  r('#f2e2c4', 4, 11, 56, 37);
  r('#c8553d', 10, 0, 44, 6); r('#f6d34a', 13, 2, 38, 2);                     // 招牌
  for (const lx of [8, 52]) { r('#e0393e', lx, 12, 6, 7); r('#f6d34a', lx + 2, 19, 2, 2); r('#a8252b', lx, 14, 6, 1); } // 燈籠
  r('#c8553d', 18, 14, 28, 9); for (let x = 20; x < 46; x += 6) r('#f2e2c4', x, 14, 1, 9);   // 布簾
  r('#5e3b20', 22, 23, 20, 25); r('#7a4e2d', 23, 24, 18, 24);                 // 門
  r('#bdbdbd', 8, 34, 10, 4); r('#d9d9d9', 8, 30, 10, 4); r('#a0a0a0', 8, 38, 10, 2); // 蒸籠
  r('#ffffff', 10, 26, 2, 3); r('#ffffff', 14, 25, 2, 4);                     // 熱氣
  r('#62ad4b', 4, 46, 18, 2); r('#62ad4b', 42, 46, 18, 2);
});
// 民宅：三種屋頂顏色
const ROOFS = ['#3b6ea8', '#4f9d6b', '#b8656e'];
export const homeSprite = (i = 0) => building('home' + i, 48, 32, (r) => {
  const roof = ROOFS[i % ROOFS.length];
  for (let k = 0; k < 10; k++) r(roof, 14 - k, 2 + k, 20 + 2 * k, 1);
  r('#2b2421', 2, 12, 44, 1);
  r('#f6efe0', 4, 13, 40, 19);
  r('#7a4e2d', 20, 19, 9, 13); r('#f6d34a', 26, 26, 1, 1);
  r('#5e3b20', 7, 17, 9, 8); r('#9ad6f6', 8, 18, 7, 6); r('#5e3b20', 33, 17, 9, 8); r('#9ad6f6', 34, 18, 7, 6);
  r('#62ad4b', 4, 30, 16, 2); r('#62ad4b', 29, 30, 15, 2);
});
// 噴水池：圓形石頭水池，中間噴水（兩張輪流畫，水會動）
export const fountainSprite = (frame = 0) => building('fountain' + frame, 32, 32, (r) => {
  r('#9c968b', 4, 6, 24, 22); r('#9c968b', 2, 9, 28, 16); r('#9c968b', 7, 4, 18, 26);
  r('#4aa3df', 5, 9, 22, 16); r('#4aa3df', 8, 7, 16, 20);
  r('#d6d1c7', 14, 8, 4, 14);
  r('#9ad6f6', 15, frame ? 2 : 4, 2, 7); r('#9ad6f6', 12, frame ? 5 : 6, 2, 3); r('#9ad6f6', 18, frame ? 6 : 5, 2, 3);
  r('#ffffff', 10, 14, 3, 1); r('#ffffff', 20, 18, 3, 1);
});

// 商店攤位（2×2 格 = 32×32）：紅白條紋遮陽棚、木櫃台、招牌
export function shopSprite() {
  if (cache.has('shop')) return cache.get('shop');
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  r('#8d5d32', 3, 10, 2, 22); r('#8d5d32', 27, 10, 2, 22);   // 柱子
  for (let i = 0; i < 8; i++) r(i % 2 ? '#ffffff' : '#e0393e', i * 4, 4, 4, 8);  // 遮陽棚
  for (let i = 0; i < 8; i++) r(i % 2 ? '#e8e8e8' : '#b52a30', i * 4, 12, 4, 2);
  r('#bd864f', 1, 20, 30, 10); r('#8d5d32', 1, 20, 30, 2); r('#8d5d32', 1, 29, 30, 2); // 櫃台
  r('#f28b2c', 6, 16, 4, 4); r('#e0393e', 12, 16, 4, 4); r('#6cc25a', 18, 16, 4, 4); r('#f6d34a', 24, 17, 3, 3); // 貨品
  r('#f6d34a', 9, 0, 14, 5); r('#8d5d32', 9, 0, 14, 1);      // 招牌
  cache.set('shop', c);
  return c;
}

// ---------------- 加工品、加工機、溫室 ----------------
// 加工品的圖：瓶子（美乃滋、番茄醬）、罐子（果醬、菜脯、泡菜、鹹菜）、起司塊。[樣子, 內容物顏色, 亮面／蓋子顏色]
export const GOOD_ART = {
  mayo: ['bottle', '#f6efc8', '#f6d34a'], mayo_l: ['bottle', '#fff4c0', '#e8b45a'],
  cheese: ['cheese', '#f6d34a', '#fff3b0'], cheese_l: ['cheese', '#f2b33d', '#f6d880'],
  jam_strawberry: ['jar', '#d9344a', '#f6b6c9'], jam_pineapple: ['jar', '#f2b33d', '#f6d880'], ketchup: ['bottle', '#d9344a', '#ffffff'],
  pickled_radish: ['jar', '#c98a3a', '#e8c28a'], kimchi: ['jar', '#e05a3a', '#f6a07a'], salted_greens: ['jar', '#6b8f3a', '#a8c26a'],
  salted_egg: ['jar', '#e8e0c8', '#f2b33d'],
  oolong: ['tin', '#2e6a3a', '#f2d6a0'], black_tea: ['tin', '#8a2a24', '#f2c84a'], white_rice: ['sack', '#f4efe0', '#d9344a'],
  dried_shiitake: ['jar', '#7a4e2d', '#c98a5a'], dried_woodear: ['jar', '#3a2a24', '#7a5a4a'], dried_shoot: ['jar', '#c9a96a', '#f2d6a0'],
};
export const goodSprite = (id) => building('good_' + id, 16, 16, (r) => {
  const [shape, main, light] = GOOD_ART[id] || ['jar', '#c8553d', '#f6d34a'];
  if (shape === 'jar') {
    r('#8d5d32', 4, 2, 8, 2); r('#5e3b20', 4, 3, 8, 1);                 // 木蓋子
    r('#c9dde6', 3, 4, 10, 10); r(main, 4, 5, 8, 8); r(light, 5, 6, 1, 5); // 玻璃罐
    r('#f4f1e8', 4, 8, 8, 3); r(main, 7, 9, 2, 1);                       // 標籤
    r('#9fb6c0', 4, 14, 8, 1);
  } else if (shape === 'bottle') {
    r(light === '#ffffff' ? '#f4f1e8' : '#e0393e', 7, 1, 2, 2);         // 瓶蓋
    r('#c9dde6', 6, 3, 4, 2); r('#c9dde6', 4, 5, 8, 9); r(main, 5, 6, 6, 7);
    r(light, 6, 7, 1, 4); r('#f4f1e8', 5, 9, 6, 2); r('#9fb6c0', 5, 14, 6, 1);
  } else if (shape === 'tin') {                                          // 茶葉罐：圓筒、金色蓋子、標籤上一片茶葉
    r('#c9a96a', 4, 2, 8, 2); r('#a8843f', 4, 3, 8, 1);
    r(main, 4, 4, 8, 10); r('#ffffff', 5, 5, 1, 8);
    r(light, 5, 7, 6, 4); r('#3f8a3a', 7, 8, 2, 2); r('#2a1e18', 4, 13, 8, 1);
  } else if (shape === 'sack') {                                         // 米袋：白色布袋，綁著繩子，紅色的字
    r('#c9a96a', 6, 2, 4, 1); r(main, 5, 3, 6, 1); r('#a8843f', 5, 4, 6, 1);
    r(main, 3, 5, 10, 9); r('#e0dcd0', 3, 13, 10, 1); r('#e0dcd0', 12, 6, 1, 7);
    r(light, 6, 7, 4, 1); r(light, 7, 8, 2, 3); r(light, 6, 10, 4, 1);
  } else {                                                               // 起司：三角形的一塊
    for (let i = 0; i < 9; i++) r(main, 13 - i, 5 + i, i + 1, 1);
    r(main, 2, 13, 12, 1); r('#c99a2e', 2, 14, 12, 1);
    r(light, 12, 6, 1, 3);
    r('#c99a2e', 9, 10, 2, 2); r('#c99a2e', 6, 12, 2, 1); r('#c99a2e', 11, 12, 1, 1); // 起司的洞
  }
});

// 加工機（一格 16×16）。busy：正在做東西（冒煙、燈亮）
export const machineSprite = (kind, busy = false, frame = 0) => building(`machine_${kind}_${busy ? 1 : 0}_${frame}`, 16, 16, (r) => {
  if (kind === 'mayo') {                                                // 美乃滋機：藍色的機器，上面有攪拌把手
    r('#2f5a8a', 2, 14, 12, 2);
    r('#5a8fc8', 2, 5, 12, 9); r('#7fb2e0', 3, 6, 10, 1);
    r('#dfe6ee', 4, 7, 8, 4); r(busy ? '#f6efc8' : '#c9d3dc', 5, 8, 6, 2);
    r('#9aa3a8', 7, 1, 2, 4); r('#9aa3a8', 7, 1, busy && frame ? 5 : 1, 1); r('#e0393e', busy && frame ? 11 : 7, 0, 2, 2);
    r(busy ? '#6cc25a' : '#3a4a5a', 11, 12, 2, 1);
  } else if (kind === 'cheese') {                                       // 起司機：木桶加上壓板的螺絲
    r('#5e3b20', 3, 14, 10, 2);
    r('#8d5d32', 3, 7, 10, 7); r('#a8743f', 4, 7, 1, 7); r('#a8743f', 8, 7, 1, 7);
    r('#5e5872', 3, 9, 10, 1); r('#5e5872', 3, 12, 10, 1);
    r('#c9c5bf', 2, 5, 12, 2); r('#9aa3a8', 7, 1, 2, 4); r('#5e5872', 5, 1, 6, 1);
    if (busy) r('#f6d34a', 4, 13, 8, 1);
  } else if (kind === 'jam') {                                          // 果醬鍋：爐子上的銅鍋
    r('#3a3a44', 3, 12, 10, 4); r(busy ? '#f28b2c' : '#5e5872', 5, 13, 6, 1);
    r('#a85a1e', 2, 6, 12, 6); r('#d9822b', 3, 6, 10, 5); r('#f2a96a', 4, 7, 2, 3);
    r('#7a3e14', 1, 7, 1, 2); r('#7a3e14', 14, 7, 1, 2);
    r(busy ? '#d9344a' : '#a85a1e', 3, 5, 10, 1);
    if (busy) { r('#ffffff', 6, frame ? 1 : 2, 1, 2); r('#ffffff', 9, frame ? 2 : 1, 1, 2); }
  } else if (kind === 'tea') {                                          // 製茶機：炒茶的滾筒，做茶的時候下面有火、冒出茶香
    r('#5e5a54', 2, 12, 12, 3); r('#3a3a3a', 3, 15, 10, 1);
    r('#8a5a28', 2, 4, 12, 8); r('#a8743f', 3, 5, 10, 2); r('#5e3b20', 2, 11, 12, 1); r('#c9a96a', 2, 7, 12, 1);
    r('#3a3a3a', 1, 6, 1, 3); r('#3a3a3a', 14, 6, 1, 3);
    if (busy) { r('#f28b2c', 4, 13, 2, 1); r('#f2c84a', 7, 13, 2, 1); r('#f28b2c', 10, 13, 2, 1); r('#9ae06a', 6, frame ? 1 : 2, 1, 2); r('#9ae06a', 9, frame ? 2 : 1, 1, 2); }
  } else if (kind === 'mill') {                                         // 碾米機：灰色的機器，上面有裝稻穀的漏斗，旁邊流出白米
    r('#7a7a80', 3, 7, 10, 7); r('#9a9aa0', 4, 8, 8, 2); r('#5e5e64', 3, 13, 10, 1); r('#3a3a3a', 3, 14, 10, 1);
    r('#c9a96a', 3, 2, 10, 2); r('#a8843f', 5, 4, 6, 1); r('#a8843f', 6, 5, 4, 2);
    r('#3a3a3a', 12, 10, 3, 2);
    if (busy) { r('#f4efe0', 14, 12, 1, 2); r('#e0b84a', 5, 2, 6, 1); r('#ffffff', 8, frame ? 8 : 9, 1, 1); }
  } else if (kind === 'dryer') {                                        // 曬架：竹子架子上曬著香菇、筍片
    r('#8d6a3a', 2, 3, 1, 13); r('#8d6a3a', 13, 3, 1, 13); r('#c9a96a', 1, 4, 14, 1); r('#c9a96a', 1, 9, 14, 1);
    r('#b8925f', 3, 5, 10, 3); r('#b8925f', 3, 10, 10, 3);
    if (busy) { for (const x of [4, 7, 10]) { r('#7a4e2d', x, 5, 2, 2); r('#e8d29a', x, 10, 2, 2); } }
    else { r('#9a8a6a', 3, 6, 10, 1); r('#9a8a6a', 3, 11, 10, 1); }
  } else {                                                              // 醃漬罈：咖啡色的陶甕，蓋子綁著紅布
    r('#5e3b20', 4, 15, 8, 1);
    r('#7a4e2d', 4, 5, 8, 10); r('#7a4e2d', 3, 7, 10, 6); r('#9a6a3e', 5, 7, 1, 6);
    r('#e0393e', 4, 3, 8, 2); r('#a8252b', 4, 4, 8, 1); r('#e0393e', 11, 5, 1, 2);
    r('#f4f1e8', 6, 8, 4, 5); r('#c8553d', 7, 9, 2, 1); r('#c8553d', 8, 10, 1, 1); r('#c8553d', 7, 11, 2, 1); // 紅字的紙條
    if (busy) r('#f6d34a', 6, 2, 1, 1);
  }
});
// 還沒買加工機的空位：木棧板＋小木牌
export const machineSpotSprite = () => building('machine_spot', 16, 16, (r) => {
  r('#bd864f', 2, 11, 12, 2); r('#bd864f', 2, 14, 12, 1); r('#8d5d32', 3, 13, 1, 2); r('#8d5d32', 12, 13, 1, 2);
  r('#8d5d32', 7, 4, 2, 7); r('#e8c28a', 4, 3, 8, 4); r('#8d5d32', 4, 3, 8, 1); r('#5e3b20', 6, 5, 4, 1);
});

// 溫室（5×3 格 = 80×48）：白色框架、玻璃牆、玻璃屋頂，看得到裡面的綠色植物；中間是玻璃門。
// 還沒蓋：圍起來的空地，插著「溫室預定地」的木牌
export function greenhouseSprite(built, ground = '#62ad4b') {
  return building(`greenhouse_${built ? 1 : 0}_${ground}`, 80, 48, (r) => {
    if (!built) {
      r('#a77b4f', 4, 14, 72, 32); r('#8d6a42', 4, 14, 72, 2);
      for (const [x, y] of [[12, 22], [30, 36], [52, 26], [64, 40], [20, 40]]) { r('#9c968b', x, y, 4, 3); r('#c9c5bf', x, y, 2, 1); }
      for (let x = 2; x < 80; x += 10) { r('#8d5d32', x, 10, 2, 8); r('#8d5d32', x, 40, 2, 8); }
      r('#bd864f', 2, 12, 76, 2); r('#bd864f', 2, 42, 76, 2);
      r('#8d5d32', 38, 18, 3, 16); r('#e8c28a', 30, 14, 20, 10); r('#8d5d32', 30, 14, 20, 1); r('#8d5d32', 30, 23, 20, 1);
      r('#4f9d3f', 34, 17, 3, 4); r('#4f9d3f', 38, 16, 3, 5); r('#4f9d3f', 42, 17, 3, 4);  // 牌子上畫著小苗
      return;
    }
    for (let i = 0; i < 16; i++) r(i % 4 === 0 ? '#ffffff' : '#bfe6f6', 8 + i, 16 - i, 64 - 2 * i, 1); // 玻璃屋頂
    r('#ffffff', 39, 0, 2, 17); r('#e8f4fa', 4, 16, 72, 2);
    r('#9fd0ea', 4, 18, 72, 30);                                       // 玻璃牆
    for (let y = 20; y < 46; y += 6) for (let x = 6; x < 74; x += 7) r((x + y) % 3 ? '#4f9d3f' : '#6cc25a', x, y + 2, 4, 3); // 裡面的植物
    for (let x = 4; x < 77; x += 12) r('#ffffff', x, 18, 2, 30);       // 白框
    r('#ffffff', 4, 30, 72, 1); r('#ffffff', 4, 46, 72, 2);
    r('#ffffff', 31, 24, 18, 24); r('#bfe6f6', 33, 26, 14, 22); r('#ffffff', 39, 26, 2, 22); r('#f6d34a', 37, 37, 2, 2); // 門
    r(ground, 4, 46, 26, 2); r(ground, 50, 46, 26, 2);
  });
}
// 溫室裡面：K 玻璃牆、地上鋪石板
export const ghTileSprite = (ch) => building('gh_' + ch, 16, 16, (r) => {
  if (ch === 'K') {
    r('#e8f4fa', 0, 0, 16, 16); r('#9fd0ea', 1, 1, 14, 14);
    r('#ffffff', 0, 7, 16, 1); r('#ffffff', 7, 0, 1, 16);
    r('#d2ecf8', 4, 2, 1, 1); r('#d2ecf8', 3, 3, 1, 1); r('#d2ecf8', 2, 4, 1, 1);   // 玻璃的反光
  } else {
    r('#cdbf9f', 0, 0, 16, 16);
    r('#b8a982', 0, 7, 16, 1); r('#b8a982', 0, 15, 16, 1); r('#b8a982', 7, 0, 1, 8); r('#b8a982', 15, 8, 1, 8);
    r('#d9cdb0', 2, 2, 2, 1); r('#d9cdb0', 10, 11, 2, 1);
  }
});

// ---------------- 果樹、蜂箱 ----------------
// 水果的圖：圓圓的果子＋一片葉子。[果皮, 亮面, 陰影, 葉子]
export const FRUIT_COLORS = {
  guava: ['#9cc95a', '#cfe59a', '#5f8a2e', '#3f9a3f'], orange: ['#f28b2c', '#f8b860', '#c8651e', '#3f9a3f'],
  mango: ['#f2b33d', '#f8d870', '#d9822b', '#3f9a3f'], lychee: ['#d9344a', '#ec6a78', '#a8252b', '#3f9a3f'],
  longan: ['#c9a06a', '#e2c592', '#8d6a42', '#3f9a3f'],
};
const FRUIT_SHAPE = ["................", "................", "........44......", ".......444......", "......4.4.......", ".....11111......", "....1122111.....", "...112211111....", "...121111111....", "...111111113....", "...111111113....", "....1111133.....", ".....33333......", "................", "................", "................"];
const CLUSTER_SHAPE = ["................", "........4.......", ".......44.......", "......4.4.......", ".....11.11......", "....1211121.....", "....1111111.....", "...11.11.111....", "...121112113....", "...111111113....", "....11.1133.....", ".....1113.......", "......33........", "................", "................", "................"];
export const fruitSprite = (id) => shaped('fruit_' + id, id === 'lychee' || id === 'longan' ? CLUSTER_SHAPE : FRUIT_SHAPE, FRUIT_COLORS[id] || FRUIT_COLORS.guava);
// 果樹：0 小樹苗、1 小樹、2 長大；ripe＝結滿了果子可以摘
export const fruitTreeSprite = (kind, stage = 2, ripe = false) => building(`tree_${kind}_${stage}_${ripe ? 1 : 0}`, 16, 16, (r) => {
  const fruit = kind === 'guava' ? '#eef5a8' : (FRUIT_COLORS[kind] || FRUIT_COLORS.guava)[0]; // 芭樂是綠的，畫淡一點才看得出來
  if (stage <= 0) {                                   // 小樹苗：一根小枝＋兩片葉子，土堆
    r('#8d6a42', 4, 13, 8, 2); r('#7a4e2d', 7, 8, 2, 5); r('#4f9d3f', 4, 6, 4, 3); r('#6cc25a', 8, 5, 4, 3);
    return;
  }
  if (stage === 1) {                                  // 小樹
    r('#7a4e2d', 7, 9, 2, 6); r('#5e3b20', 6, 14, 4, 1);
    r('#3f8a3a', 4, 3, 8, 7); r('#4f9d3f', 3, 5, 10, 4); r('#6cc25a', 5, 4, 3, 2);
    return;
  }
  r('#7a4e2d', 7, 10, 2, 6); r('#5e3b20', 5, 15, 6, 1);   // 樹幹
  r('#2f7a33', 2, 2, 12, 9); r('#3f8a3a', 1, 4, 14, 6); r('#4f9d3f', 3, 1, 10, 3); r('#6cc25a', 4, 2, 4, 2); r('#2b6a2e', 3, 10, 10, 1);
  if (ripe) for (const [x, y] of [[3, 5], [7, 3], [11, 4], [5, 8], [10, 8], [13, 7], [8, 6]]) { r(fruit, x, y, 2, 2); r('#ffffff', x, y, 1, 1); }
});
// 還沒種果樹的空位：一小塊土＋小木牌
export const treeSpotSprite = () => building('tree_spot', 16, 16, (r) => {
  r('#a77b4f', 3, 11, 10, 3); r('#8d6a42', 4, 13, 8, 1);
  r('#8d5d32', 11, 5, 1, 7); r('#e8c28a', 9, 4, 5, 3); r('#4f9d3f', 10, 5, 1, 1); r('#4f9d3f', 12, 5, 1, 1);
});
// 蜂箱：白色木箱、黃色條紋，旁邊有蜜蜂；ready＝有蜂蜜可以收（上面滴著蜜）
export const hiveSprite = (ready = false, frame = 0) => building(`hive_${ready ? 1 : 0}_${frame}`, 16, 16, (r) => {
  r('#7a4e2d', 3, 14, 10, 2);
  r('#f4f1e8', 3, 5, 10, 9); r('#d9cdb0', 3, 5, 10, 1); r('#f6d34a', 3, 8, 10, 1); r('#f6d34a', 3, 11, 10, 1);
  r('#8d5d32', 2, 3, 12, 2); r('#5e3b20', 7, 12, 2, 1);
  for (const [x, y] of frame ? [[1, 6], [13, 2], [14, 9]] : [[0, 8], [12, 1], [14, 11]]) { r('#f6d34a', x, y, 2, 1); r('#2b2421', x + 1, y, 1, 1); }
  if (ready) { r('#e8a020', 6, 5, 4, 2); r('#e8a020', 7, 7, 2, 2); }
});
export const hiveSpotSprite = () => building('hive_spot', 16, 16, (r) => { r('#9c968b', 3, 12, 10, 3); r('#c9c5bf', 4, 12, 8, 1); });
// 蜂蜜罐：百花蜜金黃色、龍眼蜜深一點
export const honeySprite = (id) => building('honeyjar_' + id, 16, 16, (r) => {
  const main = id === 'honey_l' ? '#c87a1e' : '#f2b33d';
  r('#8d5d32', 4, 2, 8, 2); r('#c9dde6', 3, 4, 10, 10); r(main, 4, 6, 8, 7); r('#ffe08a', 5, 7, 1, 4);
  r('#f4f1e8', 5, 8, 6, 2); r(main, 7, 8, 2, 1); r('#9fb6c0', 4, 14, 8, 1);
  r(main, 3, 4, 2, 2); r(main, 4, 6, 1, 1);
});

// 夜市攤位（2 格寬，32×28）：條紋遮雨棚、木頭攤子，攤子上擺的東西每一攤不一樣
const STALL_STRIPE = { goldfish: '#3a8fd6', ring: '#e0393e', snack: '#f28b2c', special: '#8a4fc0' };
export const stallSprite = (kind) => building('stall_' + kind, 32, 28, (r) => {
  const c = STALL_STRIPE[kind] || '#e0393e';
  r('#5e3b20', 2, 6, 2, 22); r('#5e3b20', 28, 6, 2, 22);                     // 柱子
  for (let i = 0; i < 8; i++) r(i % 2 ? '#ffffff' : c, i * 4, 0, 4, 8);       // 遮雨棚
  for (let i = 0; i < 8; i++) r(i % 2 ? '#ffffff' : c, i * 4 + 1, 8, 2, 2);   // 下緣的花邊
  r('#2b2421', 0, 0, 32, 1);
  r('#8d5d32', 1, 18, 30, 3); r('#a8743f', 1, 18, 30, 1);                     // 檯面
  r('#7a4e2d', 2, 21, 28, 7); r(c, 4, 22, 24, 4); r('#ffffff', 6, 23, 20, 2); // 前面的布條
  if (kind === 'goldfish') {
    r('#9ad6f6', 5, 13, 22, 5); r('#4aa3df', 5, 13, 22, 1); r('#c9dde6', 4, 12, 24, 1); // 水盆
    for (const [x, y] of [[8, 15], [14, 14], [20, 16], [24, 14]]) { r('#f28b2c', x, y, 2, 1); r('#e0393e', x + 2, y, 1, 1); }
  } else if (kind === 'ring') {
    for (let i = 0; i < 5; i++) { const x = 5 + i * 5; r(i % 2 ? '#7a4e2d' : '#3f9a3f', x, 12, 3, 6); r('#c9dde6', x + 1, 10, 1, 2); }
    r('#f6d34a', 11, 15, 5, 1); r('#f6d34a', 11, 17, 5, 1);                   // 套中的圈圈
  } else if (kind === 'snack') {
    r('#3a3a3a', 6, 15, 12, 3); r('#5a5a5a', 7, 14, 10, 1); r('#f2b33d', 9, 13, 6, 2); // 鍋子裡的雞排
    r('#ffffff', 10, 10, 1, 2); r('#ffffff', 13, 9, 1, 3);                    // 熱氣
    r('#f6efe0', 21, 12, 5, 6); r('#8d5d32', 21, 15, 5, 3); r('#2b2421', 22, 16, 1, 1); r('#2b2421', 24, 17, 1, 1); r('#e0393e', 23, 10, 1, 3); // 珍奶
  } else {
    r('#e0393e', 6, 13, 6, 5); r('#f6d34a', 8, 13, 2, 5); r('#f6d34a', 6, 15, 6, 1);   // 禮物盒
    r('#b98ae0', 15, 13, 4, 5); r('#e0c8f6', 16, 13, 1, 2);                   // 紫水晶
    r('#f2b33d', 22, 13, 5, 5); r('#8d5d32', 22, 12, 5, 1); r('#ffe08a', 23, 14, 1, 3);  // 蜂蜜
  }
});

// ---------------- 後山洞窟 ----------------
// 洞窟入口（2×2 格）：山壁上的岩石、黑黑的洞口、木頭框和掛著的油燈、鐵軌通進去
export const caveMouthSprite = () => building('cave_mouth', 32, 32, (r) => {
  r('#6e6a64', 0, 4, 32, 28); r('#8a8680', 2, 2, 28, 6); r('#8a8680', 0, 8, 4, 20); r('#8a8680', 28, 8, 4, 20); // 岩石
  r('#a4a09a', 5, 3, 6, 2); r('#a4a09a', 20, 4, 7, 2); r('#5e5a54', 3, 14, 2, 6); r('#5e5a54', 27, 18, 2, 6);
  r('#120e0c', 8, 10, 16, 22); r('#120e0c', 10, 8, 12, 2);                      // 洞口
  r('#7a4e2d', 7, 9, 2, 23); r('#7a4e2d', 23, 9, 2, 23); r('#8d5d32', 7, 8, 18, 2); // 木頭框
  r('#2b2421', 21, 10, 1, 2); r('#f6d34a', 20, 12, 3, 3); r('#fff3b0', 21, 13, 1, 1); // 油燈
  r('#9aa3a8', 11, 28, 1, 4); r('#9aa3a8', 20, 28, 1, 4);                       // 鐵軌
  for (let y = 29; y < 32; y += 2) r('#5e3b20', 10, y, 12, 1);
});
// 洞窟裡的岩壁、地面（位置不同，花紋不一樣）
export const caveTileSprite = (ch, v = 0) => building(`cave_${ch}_${v}`, 16, 16, (r) => {
  if (ch === 'X') {
    r('#3a302a', 0, 0, 16, 16); r('#4e423a', 1, 1, 6, 5); r('#4e423a', 9, 7, 6, 6); r('#2a221e', 0, 14, 16, 2);
    r('#5e5048', v ? 3 : 10, v ? 2 : 3, 3, 1); r('#5e5048', v ? 11 : 2, 9, 2, 1);
    return;
  }
  r('#5a4d44', 0, 0, 16, 16);
  const specks = [[[3, 4], [11, 9], [7, 13]], [[12, 2], [4, 10], [9, 6]], [[6, 3], [13, 12], [2, 8]]][v % 3];
  for (const [x, y] of specks) { r('#6a5d52', x, y, 2, 1); r('#4a3f38', x, y + 1, 2, 1); }
});
// 往上的梯子（光從上面照下來）、往下的洞（梯子伸出來）
export const caveLadderSprite = (down = false) => building('cave_ladder_' + (down ? 'down' : 'up'), 16, 16, (r) => {
  if (down) {
    r('#5a4d44', 0, 0, 16, 16); r('#0c0908', 2, 3, 12, 11); r('#1e1814', 3, 4, 10, 1);
    r('#8d5d32', 4, 0, 2, 12); r('#8d5d32', 10, 0, 2, 12);
    for (let y = 2; y < 12; y += 3) r('#a8743f', 4, y, 8, 1);
    return;
  }
  r('#5a4d44', 0, 0, 16, 16); r('#8a7a58', 2, 0, 12, 16);                     // 照下來的光
  r('#8d5d32', 4, 0, 2, 16); r('#8d5d32', 10, 0, 2, 16);
  for (let y = 1; y < 16; y += 3) r('#a8743f', 4, y, 8, 1);
});
// 寶箱：關著的有金色的邊；打開的蓋子掀起來、裡面空了
export const chestSprite = (opened = false) => building('chest_' + (opened ? 1 : 0), 16, 16, (r) => {
  r('#5a4d44', 0, 0, 16, 16);
  if (opened) {
    r('#5e3b20', 2, 2, 12, 4); r('#7a4e2d', 3, 3, 10, 2);                       // 掀開的蓋子
    r('#7a4e2d', 2, 7, 12, 7); r('#2b2421', 3, 8, 10, 2); r('#c9a227', 2, 7, 12, 1); r('#c9a227', 2, 13, 12, 1);
    return;
  }
  r('#7a4e2d', 2, 5, 12, 9); r('#8d5d32', 2, 5, 12, 3); r('#c9a227', 2, 8, 12, 1); r('#c9a227', 2, 13, 12, 1);
  r('#c9a227', 2, 5, 1, 9); r('#c9a227', 13, 5, 1, 9); r('#f6d34a', 7, 8, 2, 3); r('#2b2421', 7, 10, 2, 1);
});

// ---------------- 海邊 ----------------
// 沙灘、潮間帶（退潮是濕沙地、漲潮是淺海）、海、防波堤、礁石
export const beachTileSprite = (ch, v = 0, frame = 0) => building(`beach_${ch}_${v}_${frame}`, 16, 16, (r) => {
  if (ch === 's') {
    r('#ecd9a6', 0, 0, 16, 16);
    for (const [x, y] of [[[3, 4], [11, 10], [7, 13]], [[12, 3], [5, 9], [9, 6]], [[6, 2], [13, 12], [2, 11]]][v % 3]) r('#d8c28a', x, y, 2, 1);
  } else if (ch === 'dl') {          // 退潮：濕濕的沙地，有小水窪
    r('#c8b07a', 0, 0, 16, 16); r('#b49c68', 0, 0, 16, 1);
    const [x, y] = [[3, 9], [9, 4], [6, 11]][v % 3]; r('#9ad6e6', x, y, 4, 2); r('#c9eef6', x + 1, y, 1, 1);
  } else if (ch === 'dh') {          // 漲潮：淺淺的海水
    r('#7cc4dc', 0, 0, 16, 16); r('#a8dcec', (frame ? 2 : 6) + v, 5, 5, 1); r('#a8dcec', (frame ? 9 : 4), 11, 4, 1);
  } else if (ch === 'W') {           // 海：比湖深一點的藍，有白色浪花
    r('#2f7fb8', 0, 0, 16, 16); r('#4a98cc', 0, 8, 16, 8);
    r('#e8f6fb', (frame ? 3 : 7) + v * 2, 4, 4, 1); r('#e8f6fb', (frame ? 10 : 2) + v, 12, 3, 1);
  } else if (ch === 'P') {           // 防波堤的木棧道
    r('#2f7fb8', 0, 0, 16, 16); r('#8d5d32', 0, 2, 16, 12);
    for (let x = 0; x < 16; x += 4) r('#7a4e2d', x, 2, 1, 12);
    r('#a8743f', 0, 2, 16, 1); r('#5e3b20', 0, 13, 16, 1); r('#5e3b20', 2, 14, 2, 2); r('#5e3b20', 12, 14, 2, 2);
  } else if (ch === 'k') {           // 礁石
    r('#ecd9a6', 0, 0, 16, 16); r('#6e6a64', 3, 6, 10, 8); r('#6e6a64', 2, 8, 12, 5); r('#8a8680', 4, 5, 7, 3); r('#a4a09a', 5, 6, 3, 1);
    r('#4e4a44', 3, 13, 10, 1); r('#3f9a6a', 9, 11, 3, 2); r('#f4f1e8', 12, 9, 1, 1);
  }
});
// 海邊撿到的東西
const FORAGE_ART = {
  shell: (r) => { r('#f6e2d8', 4, 6, 8, 6); r('#e8b4a0', 5, 6, 1, 6); r('#e8b4a0', 8, 6, 1, 6); r('#e8b4a0', 11, 7, 1, 4); r('#c87a64', 7, 12, 2, 1); },
  conch: (r) => { r('#f2c9a0', 4, 5, 6, 8); r('#e8a070', 6, 3, 4, 3); r('#f6e2d8', 9, 8, 3, 4); r('#c87a50', 5, 7, 4, 1); r('#c87a50', 5, 10, 4, 1); },
  seaweed: (r) => { r('#3f7a3a', 5, 4, 2, 9); r('#4f9d3f', 8, 3, 2, 10); r('#2e5a2a', 11, 6, 2, 7); r('#4f9d3f', 4, 12, 9, 1); },
  sea_glass: (r) => { r('#8fd8c0', 5, 6, 6, 5); r('#c9f2e6', 6, 6, 2, 2); r('#5ab89a', 9, 9, 2, 2); },
  clam: (r) => { r('#d8c8a8', 3, 7, 10, 5); r('#b8a47a', 4, 6, 8, 1); r('#8a7a5a', 3, 11, 10, 1); r('#f4ecd8', 5, 8, 3, 1); },
  crab: (r) => { r('#e0393e', 4, 7, 8, 5); r('#a8252b', 4, 11, 8, 1); r('#e0393e', 2, 5, 2, 2); r('#e0393e', 12, 5, 2, 2); r('#2b2421', 6, 7, 1, 1); r('#2b2421', 9, 7, 1, 1);
    for (const x of [3, 5, 10, 12]) r('#a8252b', x, 12, 1, 2); },
  oyster: (r) => { r('#8a8680', 3, 6, 10, 7); r('#a4a09a', 4, 7, 8, 2); r('#e8e4dc', 6, 9, 4, 2); r('#5e5a54', 3, 12, 10, 1); },
  bamboo_shoot: (r) => {                                                 // 竹筍：一層一層的筍殼，從土裡冒出來
    r('#7a5a32', 2, 13, 12, 2); r('#9a7444', 3, 12, 10, 1);
    r('#e2c48a', 3, 10, 10, 3); r('#d1ad6e', 4, 7, 8, 3); r('#e2c48a', 5, 5, 6, 2); r('#d1ad6e', 6, 3, 4, 2); r('#c2a05a', 7, 1, 2, 2);
    r('#a8743f', 3, 10, 4, 1); r('#a8743f', 4, 7, 3, 1); r('#a8743f', 5, 5, 2, 1); r('#a8743f', 6, 3, 2, 1);
    r('#8a9a3a', 8, 0, 1, 2); r('#f4e4b8', 10, 8, 1, 4); r('#f4e4b8', 9, 5, 1, 2); },
  fern: (r) => {                                                         // 山蘇：寬寬亮亮的葉子圍成一圈
    for (const [c, k] of [['#3f8a2f', 0], ['#56a83f', 1]]) {
      const L = k ? [[5, 9, 3, 3], [4, 6, 3, 3], [4, 3, 2, 3], [5, 1, 1, 2]] : [[2, 9, 4, 3], [1, 6, 3, 3], [0, 4, 2, 2]];
      for (const [x, y, w, h] of L) { r(c, x, y, w, h); r(c, 16 - x - w, y, w, h); }
    }
    r('#6cc04a', 7, 2, 2, 10); r('#2e6a24', 7, 4, 1, 8); r('#3a7a2c', 5, 4, 1, 6); r('#3a7a2c', 10, 4, 1, 6);
    r('#2e6a24', 2, 8, 1, 3); r('#2e6a24', 13, 8, 1, 3); r('#5e3b20', 5, 12, 6, 2); r('#7a5a32', 4, 14, 8, 1); },
  raspberry: (r) => { r('#3f9a3f', 4, 3, 8, 2); for (const [x, y] of [[5, 6], [8, 6], [6, 9], [9, 9], [7, 12]]) { r('#d9344a', x, y, 3, 3); r('#f6b6c9', x, y, 1, 1); } },
  wood_ear: (r) => {                                                     // 木耳：長在倒下的木頭上，皺皺的深咖啡色
    r('#8d6a3a', 1, 9, 14, 5); r('#a8845a', 1, 9, 14, 1); r('#6b4a2a', 1, 13, 14, 1); r('#7a5a32', 6, 11, 5, 1);
    r('#d9b98a', 0, 9, 2, 5); r('#b8925f', 0, 10, 1, 3); r('#e8d2a8', 1, 11, 1, 1);
    r('#5a3428', 3, 5, 5, 5); r('#5a3428', 4, 4, 3, 1); r('#8a5a48', 4, 5, 2, 2); r('#3a2018', 4, 8, 3, 1); r('#3a2018', 7, 6, 1, 3);
    r('#5a3428', 9, 6, 5, 4); r('#5a3428', 10, 5, 3, 1); r('#8a5a48', 10, 6, 2, 1); r('#3a2018', 10, 8, 3, 1); },
  shiitake: (r) => { r('#7a4e2d', 2, 4, 12, 5); r('#a8743f', 4, 3, 8, 2); r('#f4efe0', 4, 5, 2, 1); r('#f4efe0', 9, 6, 2, 1); r('#e8dcc0', 6, 9, 4, 5); r('#c9b48a', 6, 13, 4, 1); },
  chestnut: (r) => {                                                     // 栗子：刺刺的綠殼裂開，掉出兩顆亮亮的栗子
    r('#5f8f2f', 1, 3, 7, 5); r('#7ab03f', 2, 4, 5, 2);
    for (const [x, y] of [[0, 3], [2, 2], [4, 1], [6, 2], [8, 4], [0, 6], [8, 7]]) r('#a8d060', x, y, 1, 1);
    r('#5a3418', 10, 4, 2, 1); r('#7a4422', 9, 5, 4, 1); r('#7a4422', 8, 6, 6, 5); r('#e8d29a', 8, 11, 6, 2); r('#b07a48', 9, 6, 1, 3); r('#e0b080', 9, 6, 1, 1);
    r('#5a3418', 4, 7, 2, 1); r('#7a4422', 3, 8, 4, 1); r('#7a4422', 2, 9, 6, 3); r('#e8d29a', 2, 12, 6, 2); r('#b07a48', 3, 9, 1, 2); r('#e0b080', 3, 9, 1, 1); },
  winter_shoot: (r) => {                                                // 冬筍：矮矮胖胖、還埋在土裡，筍殼是深咖啡色
    r('#6b4a2a', 1, 12, 14, 3); r('#8d6a3a', 2, 11, 12, 1);
    r('#9a6a3a', 3, 8, 10, 4); r('#7a4e2d', 4, 6, 8, 2); r('#9a6a3a', 5, 4, 6, 2); r('#7a4e2d', 6, 3, 4, 1); r('#5e3b20', 7, 2, 2, 1);
    r('#5e3b20', 3, 8, 4, 1); r('#5e3b20', 5, 4, 2, 1); r('#c9a96a', 10, 7, 1, 4); r('#c9a96a', 9, 4, 1, 2); r('#6b7a3a', 8, 1, 1, 1); },
  lingzhi: (r) => {                                                      // 靈芝：亮亮的紅褐色、扇子一樣的菌傘，邊緣金黃色
    r('#5e3b20', 7, 9, 2, 4); r('#6b4a2a', 4, 13, 8, 2); r('#8d6a3a', 5, 13, 6, 1);
    r('#f2c84a', 1, 4, 14, 4); r('#f2c84a', 3, 3, 10, 1); r('#f2c84a', 3, 8, 10, 1);
    r('#7a2a18', 2, 4, 12, 4); r('#7a2a18', 4, 3, 8, 1); r('#a8402a', 4, 4, 8, 2); r('#c8603d', 6, 4, 4, 1); r('#f6e8b0', 6, 4, 2, 1);
    r('#f2c84a', 9, 10, 6, 2); r('#7a2a18', 10, 10, 4, 1); r('#a8402a', 11, 10, 2, 1); },
  dandelion: (r) => { r('#3f9a3f', 7, 7, 2, 8); r('#4f9d3f', 4, 12, 3, 2); r('#4f9d3f', 9, 11, 3, 2); r('#f6d34a', 5, 3, 6, 5); r('#f2b33d', 7, 4, 2, 3); },
  ginger_lily: (r) => { r('#3f9a3f', 7, 6, 2, 9); r('#4f9d3f', 3, 9, 4, 2); r('#f4f1e8', 4, 2, 4, 4); r('#f4f1e8', 8, 3, 4, 4); r('#f6efc8', 6, 4, 4, 3); r('#f6d34a', 7, 5, 1, 1); },
  kumquat: (r) => { r('#3f9a3f', 6, 3, 4, 2); for (const [x, y] of [[4, 6], [9, 6], [6, 10]]) { r('#f28b2c', x, y, 4, 4); r('#f8b860', x + 1, y + 1, 1, 1); } },
  tea_leaf: (r) => { for (const [x, y] of [[3, 5], [8, 3], [6, 8], [10, 8], [4, 10]]) { r('#3f8a3a', x, y, 3, 4); r('#2e6a2e', x + 1, y, 1, 4); r('#9ae06a', x, y, 1, 1); } },
  tea_summer: (r) => { for (const [x, y] of [[3, 5], [8, 3], [6, 8], [10, 8], [4, 10]]) { r('#7a9a3a', x, y, 3, 4); r('#5e7a2e', x + 1, y, 1, 4); r('#e0d07a', x + 2, y + 1, 1, 1); } },
};
export const forageSprite = (id) => building('forage_' + id, 16, 16, (r) => (FORAGE_ART[id] || FORAGE_ART.shell)(r));

// ---------------- 小鎮修復計畫 ----------------
// 四個地方（2×2 格，32×32）：修好之前顏色褪掉、屋頂破洞、釘著木板；修好之後漂漂亮亮
const PROJECT_LOOK = {
  temple: { roof: '#c8302e', trim: '#f2c94a', wall: '#f2e2c4', door: '#8a2a20', old: ['#7a6a5e', '#9c8e80', '#b8ab98'] },
  station: { roof: '#3b6ea8', trim: '#f4f1e8', wall: '#e8e4dc', door: '#5e3b20', old: ['#5e6670', '#8a8e92', '#b4b0a8'] },
  coop: { roof: '#3f7a3a', trim: '#f6d34a', wall: '#f4efe0', door: '#7a4e2d', old: ['#5e6a58', '#8e9484', '#b8b4a4'] },
  harbor: { roof: '#7a4e2d', trim: '#4aa3df', wall: '#c9a477', door: '#5e3b20', old: ['#5e5048', '#7e7064', '#a09280'] },
};
export const projectSprite = (kind, restored) => building(`project_${kind}_${restored ? 1 : 0}`, 32, 32, (r) => {
  const L = PROJECT_LOOK[kind] || PROJECT_LOOK.coop;
  const roof = restored ? L.roof : L.old[0], trim = restored ? L.trim : L.old[1], wall = restored ? L.wall : L.old[2];
  if (kind === 'temple') {
    // 土地公廟：翹起來的屋簷、紅柱子、香爐
    r(roof, 2, 6, 28, 4); r(roof, 0, 5, 4, 2); r(roof, 28, 5, 4, 2); r(roof, 6, 2, 20, 4); r(trim, 4, 10, 24, 1); r(trim, 13, 0, 6, 3);
    r(wall, 4, 11, 24, 19); r(restored ? '#c8302e' : L.old[1], 5, 11, 3, 19); r(restored ? '#c8302e' : L.old[1], 24, 11, 3, 19);
    r(L.door, 12, 16, 8, 14); r(restored ? '#f6d34a' : '#8a8680', 14, 13, 4, 2);
    if (restored) { r('#8d5d32', 13, 26, 6, 3); r('#c9a227', 14, 25, 4, 1); r('#ffffff', 15, 21, 1, 4); r('#ffffff', 17, 22, 1, 3); }
  } else if (kind === 'station') {
    // 老車站：斜屋頂、時鐘、站牌、月台
    r(roof, 0, 4, 32, 6); r(trim, 0, 10, 32, 1); r(wall, 2, 11, 28, 17); r('#8a8680', 0, 28, 32, 4);
    r(trim, 12, 0, 8, 6); r(restored ? '#2b2421' : L.old[0], 15, 2, 2, 2);
    r(L.door, 13, 18, 6, 10); r(restored ? '#9ad6f6' : L.old[0], 4, 15, 6, 6); r(restored ? '#9ad6f6' : L.old[0], 22, 15, 6, 6);
    if (restored) { r('#3b6ea8', 4, 12, 24, 2); r('#f4f1e8', 8, 12, 16, 2); }
  } else if (kind === 'coop') {
    // 農會：倉庫式的屋頂、招牌、門口的稻穀袋
    for (let k = 0; k < 8; k++) r(roof, 8 - k, 2 + k, 16 + 2 * k, 1);
    r(wall, 2, 10, 28, 20); r(trim, 6, 11, 20, 3); r(L.door, 12, 18, 8, 12); r('#5e3b20', 15, 18, 2, 12);
    if (restored) { r('#e8d29a', 3, 24, 5, 6); r('#c9a96a', 3, 24, 5, 1); r('#e8d29a', 24, 25, 5, 5); r('#4f9d3f', 9, 12, 3, 1); }
  } else {
    // 漁會：木頭小屋、晾著的漁網、船錨
    r(roof, 0, 6, 32, 5); r(roof, 4, 3, 24, 3); r(wall, 2, 11, 28, 18); for (let x = 2; x < 30; x += 4) r(L.old[0], x, 11, 1, 18);
    r(L.door, 13, 18, 6, 11); r(trim, 4, 14, 6, 5); r(trim, 22, 14, 6, 5);
    if (restored) { for (let x = 22; x < 30; x += 2) r('#e8e4dc', x, 21, 1, 8); for (let y = 21; y < 29; y += 2) r('#e8e4dc', 22, y, 8, 1);
      r('#5e5a54', 4, 22, 1, 6); r('#5e5a54', 2, 26, 5, 1); r('#5e5a54', 3, 22, 3, 1); }
  }
  if (!restored) {
    // 釘起來的木板、裂痕、施工中的牌子
    r('#a8743f', 10, 19, 12, 2); r('#a8743f', 11, 24, 10, 2); r('#5e3b20', 10, 19, 1, 2); r('#5e3b20', 21, 24, 1, 2);
    r('#2b2421', 6, 13, 1, 4); r('#2b2421', 7, 16, 1, 3); r('#2b2421', 25, 6, 3, 1);
    r('#f6d34a', 1, 26, 8, 5); r('#2b2421', 2, 27, 6, 1); r('#2b2421', 2, 29, 6, 1); r('#5e3b20', 4, 31, 2, 1);
  }
});

// ---------------- 裝飾與家具 ----------------
const DECO_ART = {
  flowerbed: (r) => { r('#7a4e2d', 1, 9, 14, 6); r('#5e3b20', 1, 14, 14, 1); r('#4f9d3f', 2, 6, 12, 4);
    for (const [x, y, c] of [[3, 5, '#e0393e'], [6, 4, '#f6d34a'], [9, 5, '#f6b6c9'], [12, 4, '#b56ee0'], [4, 8, '#f6d34a'], [10, 8, '#e0393e']]) r(c, x, y, 2, 2); },
  bench: (r) => { r('#8d5d32', 1, 6, 14, 2); r('#8d5d32', 1, 9, 14, 2); r('#a8743f', 1, 6, 14, 1); r('#5e3b20', 2, 11, 2, 4); r('#5e3b20', 12, 11, 2, 4); r('#5e3b20', 2, 3, 1, 4); r('#5e3b20', 13, 3, 1, 4); r('#8d5d32', 1, 3, 14, 2); },
  lamp: (r) => { r('#3a3a40', 7, 4, 2, 11); r('#3a3a40', 5, 14, 6, 2); r('#3a3a40', 5, 1, 6, 1); r('#f6e08a', 5, 2, 6, 3); r('#fff3b0', 6, 2, 4, 2); },
  scarecrow: (r) => { r('#8d5d32', 7, 4, 2, 12); r('#8d5d32', 2, 7, 12, 1); r('#c9302e', 5, 7, 6, 5); r('#f2d6a0', 6, 2, 4, 4); r('#c9a96a', 4, 1, 8, 2); r('#2b2421', 7, 3, 1, 1); r('#2b2421', 9, 3, 1, 1); r('#e8d29a', 1, 7, 2, 2); r('#e8d29a', 13, 7, 2, 2); },
  windmill: (r, f) => { r('#e8e4dc', 6, 6, 4, 10); r('#c9c5bf', 6, 6, 1, 10); r('#c8302e', 5, 4, 6, 3); r('#5e3b20', 7, 12, 2, 4);
    if (f) { r('#f4f1e8', 7, 0, 2, 5); r('#f4f1e8', 7, 5, 2, 5); r('#f4f1e8', 2, 4, 5, 2); r('#f4f1e8', 9, 4, 5, 2); }
    else { r('#f4f1e8', 3, 1, 2, 2); r('#f4f1e8', 5, 3, 2, 2); r('#f4f1e8', 11, 1, 2, 2); r('#f4f1e8', 9, 3, 2, 2); r('#f4f1e8', 3, 7, 2, 2); r('#f4f1e8', 11, 7, 2, 2); }
    r('#2b2421', 7, 4, 2, 2); },
  swing: (r) => { r('#8d5d32', 1, 2, 2, 14); r('#8d5d32', 13, 2, 2, 14); r('#8d5d32', 1, 1, 14, 2); r('#c9c5bf', 5, 3, 1, 8); r('#c9c5bf', 10, 3, 1, 8); r('#c8302e', 4, 11, 8, 2); },
  stone_lantern: (r) => { r('#9c968b', 6, 11, 4, 4); r('#9c968b', 4, 14, 8, 2); r('#9c968b', 3, 3, 10, 2); r('#b4b0a8', 5, 5, 6, 5); r('#f6e08a', 6, 6, 4, 3); r('#9c968b', 7, 1, 2, 2); },
  mailbox: (r) => { r('#5e3b20', 7, 8, 2, 8); r('#2f7a3a', 3, 3, 10, 6); r('#3f9a3f', 3, 3, 10, 2); r('#2b2421', 4, 6, 8, 1); r('#e0393e', 12, 2, 1, 4); r('#e0393e', 12, 2, 2, 1); },
  birdhouse: (r) => { r('#5e3b20', 7, 9, 2, 7); r('#c98a3a', 4, 4, 8, 6); r('#8d4a2a', 3, 3, 10, 2); r('#8d4a2a', 5, 2, 6, 1); r('#2b2421', 7, 6, 2, 2); r('#5e3b20', 7, 8, 2, 1); },
  umbrella: (r) => { r('#e8e4dc', 7, 6, 2, 10); for (let i = 0; i < 6; i++) r(i % 2 ? '#ffffff' : '#4aa3df', 1 + i * 2, 2, 2, 4); r('#4aa3df', 3, 1, 10, 1); r('#a8743f', 4, 12, 8, 2); },
  bed: (r) => { r('#8d5d32', 1, 3, 14, 12); r('#f4f1e8', 2, 4, 12, 4); r('#e8e4dc', 3, 5, 4, 2); r('#e8e4dc', 9, 5, 4, 2); r('#d9544d', 2, 8, 12, 6); r('#e8857e', 2, 8, 12, 1); },
  sofa: (r) => { r('#3b6ea8', 1, 4, 14, 5); r('#4f86c6', 1, 8, 14, 4); r('#3b6ea8', 0, 6, 2, 7); r('#3b6ea8', 14, 6, 2, 7); r('#5e3b20', 2, 12, 1, 2); r('#5e3b20', 13, 12, 1, 2); r('#f6d34a', 4, 6, 3, 2); },
  tv: (r) => { r('#5e3b20', 1, 11, 14, 4); r('#2b2421', 2, 2, 12, 9); r('#4aa3df', 3, 3, 10, 7); r('#9ad6f6', 4, 4, 4, 2); r('#2b2421', 7, 10, 2, 1); },
  table: (r) => { r('#a8743f', 1, 5, 14, 5); r('#c98a3a', 1, 5, 14, 1); r('#5e3b20', 2, 10, 2, 5); r('#5e3b20', 12, 10, 2, 5); r('#f4f1e8', 5, 6, 3, 2); r('#e0393e', 9, 6, 2, 2); },
  teatable: (r) => { r('#5e3b20', 2, 7, 12, 4); r('#7a4e2d', 2, 7, 12, 1); r('#3a2818', 3, 11, 2, 4); r('#3a2818', 11, 11, 2, 4);
    r('#c8553d', 5, 4, 4, 3); r('#c8553d', 9, 5, 1, 1); r('#e8e4dc', 10, 5, 2, 2); r('#e8e4dc', 3, 5, 1, 2); },
  bookshelf: (r) => { r('#7a4e2d', 2, 1, 12, 15); r('#5e3b20', 3, 2, 10, 4); r('#5e3b20', 3, 7, 10, 4); r('#5e3b20', 3, 12, 10, 3);
    for (const [x, y, c] of [[3, 2, '#e0393e'], [5, 3, '#4aa3df'], [7, 2, '#f6d34a'], [9, 3, '#3f9a3f'], [11, 2, '#b56ee0'], [4, 7, '#f6d34a'], [6, 8, '#e0393e'], [9, 7, '#4aa3df']]) r(c, x, y, 2, 6 - (y % 5)); },
  plant: (r) => { r('#c8553d', 5, 10, 6, 5); r('#a8432e', 5, 10, 6, 1); r('#3f9a3f', 4, 3, 3, 7); r('#4f9d3f', 8, 1, 3, 9); r('#2e7a2e', 6, 5, 2, 5); r('#4f9d3f', 10, 5, 3, 3); },
  rug: (r) => { r('#c8553d', 1, 3, 14, 10); r('#e8b45a', 2, 4, 12, 8); r('#c8553d', 4, 6, 8, 4); r('#f4f1e8', 6, 7, 4, 2); },
  floor_lamp: (r) => { r('#3a3a40', 7, 6, 2, 9); r('#3a3a40', 5, 14, 6, 2); r('#f2e2c4', 4, 1, 8, 5); r('#fff3b0', 5, 2, 6, 3); },
  photo: (r) => { r('#8d5d32', 3, 2, 10, 9); r('#f4f1e8', 4, 3, 8, 7); r('#9ad6f6', 4, 3, 8, 3); r('#d9544d', 5, 6, 2, 3); r('#3b6ea8', 8, 6, 2, 3); r('#f2d6a0', 5, 5, 2, 1); r('#f2d6a0', 8, 5, 2, 1); r('#5e3b20', 7, 11, 2, 4); r('#5e3b20', 5, 14, 6, 1); },
};
export const decoSprite = (id, frame = 0) => building(`deco_${id}_${frame}`, 16, 16, (r) => (DECO_ART[id] || DECO_ART.flowerbed)(r, frame));
// 屋子裡：木頭牆、木地板、門口的腳踏墊
export const homeTileSprite = (ch, v = 0) => building(`home_${ch}_${v}`, 16, 16, (r) => {
  if (ch === 'X') { r('#c9a477', 0, 0, 16, 16); r('#b08a5e', 0, 0, 16, 2); r('#8d6a45', 0, 13, 16, 3); for (let x = 2; x < 16; x += 5) r('#b8925f', x, 2, 1, 11); return; }
  if (ch === 'E') { r('#d9b98a', 0, 0, 16, 16); r('#3f7a3a', 2, 4, 12, 9); r('#4f9d3f', 3, 5, 10, 7); return; }
  r('#d9b98a', 0, 0, 16, 16); r('#c9a477', 0, 7, 16, 1); r('#c9a477', 0, 15, 16, 1);
  r('#c9a477', (v * 5 + 3) % 16, 0, 1, 7); r('#c9a477', (v * 7 + 10) % 16, 8, 1, 7);
});

// ---------------- 肥料、灑水器、稻草人、烏鴉、作物星級（第十九期） ----------------
// 肥料袋：袋子顏色、標籤、深色；普通肥料畫一片葉子、速效肥料一道閃電、高級肥料一顆星
const FERT_COLORS = { basic: ['#8d6a3a', '#f2d6a0', '#5e3b20', '#c9a96a'], speed: ['#3f8a2f', '#d6f5a8', '#2a5e22', '#7ed05a'], quality: ['#3a5a9a', '#f6e8b0', '#24386a', '#f2c84a'] };
export const fertSprite = (id) => building('fert_' + id, 16, 16, (r) => {
  const [bag, label, dark] = FERT_COLORS[id] || FERT_COLORS.basic;
  r(dark, 5, 1, 6, 2); r(bag, 4, 3, 8, 1); r(bag, 3, 4, 10, 10); r(dark, 3, 13, 10, 1); r(dark, 12, 5, 1, 8); r(label, 5, 6, 6, 5);
  if (id === 'speed') { r('#f2b33d', 8, 6, 2, 2); r('#f2b33d', 7, 8, 2, 1); r('#f2b33d', 6, 9, 2, 1); r('#f2b33d', 8, 9, 1, 2); }
  else if (id === 'quality') { r('#f2b33d', 7, 6, 2, 5); r('#f2b33d', 5, 8, 6, 1); r('#f2b33d', 6, 9, 4, 1); }
  else { r('#4f9d3f', 6, 7, 4, 2); r('#4f9d3f', 7, 9, 2, 1); r('#2e6a24', 8, 9, 1, 2); }
});
// 施過肥的土：撒了一點一點的肥料
export const fertDotsSprite = (id) => building('fertdots_' + id, 16, 16, (r) => {
  const c = (FERT_COLORS[id] || FERT_COLORS.basic)[3];
  for (const [x, y] of [[2, 3], [7, 2], [12, 4], [4, 8], [10, 9], [2, 13], [8, 13], [13, 12]]) r(c, x, y, 1, 1);
});
// 灑水器（銅色、高級的是銀色加金色噴頭）、稻草人；frame 1 是灑水器噴水的樣子
export const gearSprite = (id, frame = 0) => building(`gear_${id}_${frame}`, 16, 16, (r) => {
  if (id === 'scarecrow') {
    r('#8d6a3a', 7, 6, 2, 10); r('#8d6a3a', 1, 8, 14, 1);
    r('#e8d29a', 1, 9, 2, 2); r('#e8d29a', 13, 9, 2, 2);
    r('#d9544d', 4, 8, 8, 5); r('#b8433d', 4, 12, 8, 1); r('#f2d6a0', 7, 9, 2, 3);
    r('#e8d29a', 5, 13, 2, 2); r('#e8d29a', 9, 13, 2, 2);
    r('#f2d6a0', 6, 3, 4, 4); r('#3a2a24', 6, 4, 1, 1); r('#3a2a24', 9, 4, 1, 1); r('#3a2a24', 7, 6, 2, 1);
    r('#c9a96a', 3, 2, 10, 1); r('#e2c48a', 5, 0, 6, 2); r('#d9544d', 5, 1, 6, 1);
    return;
  }
  const [body, top] = id === 'sprinkler2' ? ['#c0c8d0', '#f2c84a'] : ['#c98a3a', '#8a5a28'];
  r('#5e5a54', 4, 12, 8, 2); r('#7a766e', 5, 12, 6, 1);
  r(body, 7, 6, 2, 6); r('#f4f1e8', 7, 7, 1, 3);
  r(top, 5, 4, 6, 2); r(body, 6, 3, 4, 1); r('#3a3a3a', 7, 5, 2, 1);
  if (id === 'sprinkler2') { r(top, 4, 5, 1, 1); r(top, 11, 5, 1, 1); }
  if (frame) for (const [x, y] of [[3, 2], [12, 2], [1, 4], [14, 4], [5, 0], [10, 0], [2, 7], [13, 7]]) r('#8fd3f5', x, y, 1, 2);
});
// 灑水器澆水時，旁邊的田上冒出的小水珠
export const spraySprite = () => building('spray', 16, 16, (r) => {
  for (const [x, y] of [[3, 3], [11, 2], [7, 7], [2, 11], [13, 10], [8, 13]]) { r('#8fd3f5', x, y, 1, 2); r('#e0f4fc', x, y, 1, 1); }
});
// 烏鴉：黑色的鳥，黃嘴巴
export const crowSprite = (frame = 0) => building('crow_' + frame, 16, 16, (r) => {
  r('#1e1e24', 4, 7, 7, 5); r('#1e1e24', 9, 4, 4, 4); r('#1e1e24', 1, 8, 3, 2); r('#34343e', 5, 8, 4, 2);
  r('#f2b33d', 13, 6, 2, 1); r('#f4f1e8', 11, 5, 1, 1);
  r('#f2b33d', 6, 12, 1, 2); r('#f2b33d', 9, 12, 1, 2);
  if (frame) { r('#1e1e24', 4, 4, 4, 3); r('#34343e', 5, 5, 2, 1); }
});
// 作物的星級：左下角一顆星（銅星、銀星、金星），先畫深色的影子比較看得清楚
const STAR = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
const STAR_COLORS = { 1: '#d08a3a', 2: '#dfe5ec', 3: '#f6c83a' };
export function qualitySprite(base, q) {
  const key = `q_${base}_${q}`;
  if (cache.has(key)) return cache.get(key);
  const src = sprite(base), u = src.hd || 1; // 32×32 的圖：星星也放大兩倍
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  if (src.hd) { c.hd = src.hd; c.oy = src.oy || 0; }
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  // 先在星星的四周描一圈深色的邊，放在白色的菜上面也看得清楚
  g.fillStyle = '#2a1c10';
  STAR.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '#') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.fillRect((x + 1 + dx) * u, (y + 8 + dy) * u, u, u);
  }));
  STAR.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') { g.fillStyle = STAR_COLORS[q] || STAR_COLORS[3]; g.fillRect((x + 1) * u, (y + 8) * u, u, u); } }));
  cache.set(key, c);
  return c;
}

// ---------------- 梯田：水田、茶樹、稻子（第二十期） ----------------
// 水田：一格一格的水，倒映著天空，右邊、下面是田埂；frame 讓水面的亮光動一下
export const paddySprite = (v = 0, frame = 0) => building(`paddy_${v}_${frame}`, 16, 16, (r) => {
  r('#5f8f86', 0, 0, 16, 15); r('#6e9f94', 0, 0, 15, 5); r('#57816f', 0, 11, 15, 4);           // 水（帶一點泥巴的綠）
  r('#c4e0dc', 2 + ((v * 5 + frame * 3) % 9), 3 + v, 3, 1); r('#a8d0c8', 3 + ((v * 3 + frame * 5) % 8), 9 + v, 2, 1);
  r('#6b5636', 15, 0, 1, 16); r('#6b5636', 0, 15, 16, 1);                                       // 田埂
  r('#6fa04a', 15, (v * 5) % 12, 1, 2); r('#6fa04a', (v * 7) % 12 + 1, 15, 2, 1);               // 田埂上的草
});
// 茶樹：一叢一叢圓圓的，冬天顏色深一點
export const teaBushSprite = (season = '') => building(`teabush_${season}`, 16, 16, (r) => {
  const [dark, mid] = season === 'winter' ? ['#264e26', '#336a33'] : ['#2e6a2e', '#3f8a3a'];
  r('#5e4a30', 2, 13, 12, 2);
  r(dark, 1, 6, 14, 8); r(dark, 2, 4, 12, 2); r(mid, 2, 5, 12, 6); r(mid, 3, 3, 10, 2);
  for (const [x, y] of [[3, 5], [7, 4], [11, 5], [5, 8], [9, 8], [12, 9], [3, 10]]) r('#5fa84a', x, y, 2, 1);
  r('#1e4a1e', 1, 13, 14, 1);
});
// 茶樹冒出新芽：今天還可以採（夏天的嫩芽黃綠色，被小綠葉蟬咬過）
export const teaBudsSprite = (summer = false) => building('teabuds_' + (summer ? 1 : 0), 16, 16, (r) => {
  const c = summer ? '#c8e07a' : '#9ae06a';
  for (const [x, y] of [[3, 2], [7, 1], [11, 2], [5, 3], [9, 3], [13, 4], [2, 4]]) { r(c, x, y, 1, 2); r('#e8f8c0', x, y, 1, 1); }
});
// 稻子：插秧的小苗 → 長高 → 綠油油 → 金黃色的稻穗垂下來
export const riceSprite = (stage) => building('rice_' + stage, 16, 16, (r) => {
  const bases = [[4, 7], [11, 7], [4, 15], [11, 15]];
  const h = [2, 4, 6, 6][stage] || 2, c = stage === 3 ? '#d8b040' : stage === 2 ? '#3f8a2f' : '#5fb84a';
  for (const [bx, by] of bases) {
    r(c, bx, by - h, 1, h); r(c, bx - 1, by - h + 1, 1, h - 1); r(c, bx + 1, by - h + 1, 1, h - 1);
    if (stage >= 1) { r(c, bx - 2, by - h + 2, 1, h - 2); r(c, bx + 2, by - h + 2, 1, h - 2); }
    if (stage === 3) { r('#f2d06a', bx - 2, by - h - 1, 2, 2); r('#f2d06a', bx + 1, by - h - 1, 2, 2); r('#e0b84a', bx, by - h - 1, 1, 1); }
  }
});

// ---------------- 家庭留言板（第二十一期） ----------------
// 軟木塞板子，上面釘著幾張彩色的小紙條（n 張，最多畫 6 張）
export const familyBoardSprite = (n = 0) => building('familyboard_' + n, 16, 16, (r) => {
  r('#7a4e2d', 3, 11, 2, 5); r('#7a4e2d', 11, 11, 2, 5);
  r('#8d5d32', 1, 1, 14, 11); r('#c9a477', 2, 2, 12, 9); r('#b08a5e', 2, 10, 12, 1);
  const spots = [[3, 3], [7, 3], [11, 3], [4, 7], [8, 7], [11, 7]], cols = ['#f6e08a', '#f6b6c9', '#a8d8f0', '#c8f0a8', '#f2c8a0', '#e0c8f0'];
  for (let i = 0; i < Math.min(6, n); i++) { const [x, y] = spots[i]; r(cols[i], x, y, 3, 3); r('#d9344a', x + 1, y, 1, 1); }
});

// ---------------- 馬（第二十二期） ----------------
// 咖啡色的馬，黑色的鬃毛和尾巴；frame 1 腳換一下（走路）；flip 往左看
export const horseSprite = (frame = 0, flip = false) => {
  const c = building(`horse_${frame}`, 16, 16, (r) => {
    r('#8a5a32', 3, 7, 9, 5); r('#a8743f', 4, 7, 7, 2);                         // 身體
    r('#8a5a32', 10, 3, 3, 6); r('#8a5a32', 12, 2, 3, 3); r('#f4efe0', 14, 3, 1, 1); r('#2a1e18', 13, 3, 1, 1); // 脖子、頭、眼睛
    r('#2a1e18', 10, 2, 2, 5); r('#2a1e18', 1, 7, 2, 5);                        // 鬃毛、尾巴
    r('#c84a3a', 6, 6, 4, 2);                                                    // 紅色的馬鞍
    const legs = frame ? [[4, 0], [6, 1], [9, 1], [11, 0]] : [[4, 1], [6, 0], [9, 0], [11, 1]];
    for (const [x, d] of legs) { r('#6b4428', x, 12, 1, 3 - d); r('#2a1e18', x, 15 - d, 1, 1); }
  });
  if (!flip) return c;
  const key = `horse_${frame}_flip`;
  if (cache.has(key)) return cache.get(key);
  const f = document.createElement('canvas'); f.width = 16; f.height = 16;
  const g = f.getContext('2d'); g.translate(16, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
  cache.set(key, f);
  return f;
};
