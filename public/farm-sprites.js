// 家族小牧場的像素圖：全部用程式畫，不用外部素材，也就沒有授權問題。
// 每張 16×16，每個字元是一個像素（. 是透明），顏色對照 PALETTE。
// 'S' 是衣服顏色，畫角色時換成每位家人的頭像顏色。
// 改圖直接改下面的字串即可：每行 16 個字元、每張 16 行。

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
  if (name.startsWith('fish_')) return fishSprite(name.slice(5));
  if (name.startsWith('ore_')) return oreSprite(name.slice(4));
  if (name.startsWith('dish_')) { const [id, shape] = name.slice(5).split('@'); return dishSprite(id, shape); }
  if (name.startsWith('good_')) return goodSprite(name.slice(5));
  if (name.startsWith('fruit_')) return fruitSprite(name.slice(6));
  if (name.startsWith('forage_')) return forageSprite(name.slice(7));
  if (name.startsWith('tree_')) { const [, kind, stage, ripe] = name.split('_'); return fruitTreeSprite(kind, Number(stage), ripe === 'r'); }
  if (name === 'honey' || name === 'honey_l') return honeySprite(name);
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
export const DISH_COLORS = {"stirfry": ["#4f9d3f", "#8fd16a"], "tomato_egg": ["#e0393e", "#f6d34a"], "carrot_egg": ["#f28b2c", "#f6d34a"], "eggplant": ["#7b3fa0", "#c8553d"], "potato_salad": ["#f2e2a0", "#f6d34a"], "corn_grill": ["#f2b33d", "#8d5d32"], "cabbage_rice": ["#f4f1e8", "#9dd17a"], "sweetpotato_congee": ["#f4efe0", "#e8913a"], "radish_soup": ["#e9e4c8", "#ffffff"], "pumpkin_soup": ["#f2a03a", "#ffffff"], "fish_braised": ["#8a4a2a", "#c96a3a"], "bass_soup": ["#e8e4d0", "#d9b44a"], "eel_rice": ["#6b3a1e", "#f4f1e8"], "pudding": ["#f6d880", "#8d5d32"], "strawberry_milk": ["#f6b6c9", "#e0393e"], "watermelon_juice": ["#f05a5a", "#4f9d3f"], "pineapple_cake": ["#e8b45a", "#f6d34a"], "niangao": ["#c98a3a", "#e8b45a"], "tangyuan": ["#f4f1e8", "#f6b6c9"], "zongzi": ["#4f7d3a", "#8fb35a"], "mooncake": ["#c98a3a", "#8d5d32"], "candy": ["#e0393e", "#f6d34a"], "cake": ["#f6efe0", "#e0393e"], "caipu_egg": ["#f6d34a", "#c98a3a"], "kimchi_pot": ["#e05a3a", "#f6d880"], "cheese_potato": ["#f6d34a", "#e8913a"], "pancake": ["#e8b45a", "#d9344a"], "fries": ["#f2c94a", "#d9344a"], "corn_salad": ["#f6d34a", "#f6efc8"], "golden_pumpkin": ["#f2a03a", "#f6d34a"], "bbq": ["#8d4a2a", "#f2b33d"], "mango_ice": ["#f2b33d", "#f4f1e8"], "orange_juice": ["#f28b2c", "#f8b860"], "honey_potato": ["#e8913a", "#c87a1e"], "honey_cake": ["#e8b45a", "#8d5d32"], "saury_grill": ["#5a7ea8", "#e8913a"], "clam_soup": ["#f4efe0", "#d9b44a"], "squid_sanbei": ["#c87a3a", "#4f9d3f"], "hairtail_sweet": ["#e05a3a", "#f4f6f8"], "seafood_congee": ["#f4efe0", "#e0393e"], "karasumi": ["#e8913a", "#c8553d"], "tuna_sashimi": ["#d9344a", "#f6b6c9"]};
const DISH_KIND = { plate: ['#f4f1ea', '#c9c5bf'], bowl: ['#f4f1ea', '#5a8fc8'], cup: ['#d9eef6', '#e0393e'] };
export const dishSprite = (id, shape = 'plate') => shaped('dish_' + id, DISH_SHAPES[shape] || DISH_SHAPES.plate,
  [...(DISH_COLORS[id] || ['#c8553d', '#f6d34a']), ...(DISH_KIND[shape] || DISH_KIND.plate)]);
export const fishSprite = (id) => shaped('fish_' + id, id === 'junk' ? BOOT_SHAPE : id === 'squid' ? SQUID_SHAPE : id === 'octopus' ? OCTO_SHAPE : FISH_SHAPE,
  FISH_COLORS[id] || FISH_COLORS.tilapia);
export const oreSprite = (id) => shaped('ore_' + id, ROCK_SHAPE, ORE_COLORS[id] || ORE_COLORS.stone);

// 作物某個階段的圖：種子、發芽兩個階段每種作物長得一樣，共用小白菜那兩張
export function cropSprite(crop, stage) {
  const name = `${crop}_${stage}`;
  if (SPRITES[name]) return sprite(name);
  return sprite(stage <= 1 ? `bokchoy_${Math.max(0, stage)}` : 'bokchoy_3');
}
export const hasCropArt = (crop) => !!SPRITES[`${crop}_3`];

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
};
export const forageSprite = (id) => building('forage_' + id, 16, 16, (r) => (FORAGE_ART[id] || FORAGE_ART.shell)(r));
