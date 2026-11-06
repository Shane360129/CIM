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
 ]
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
};
export const ORE_COLORS = {
  stone: ['#a4a09a', '#8a8680', '#6e6a64', '#c9c5bf'],
  copper: ['#a4a09a', '#d9822b', '#6e6a64', '#c9c5bf'],
  silver: ['#a4a09a', '#eef2f6', '#6e6a64', '#c9c5bf'],
  gold: ['#a4a09a', '#f6d34a', '#6e6a64', '#c9c5bf'],
  amethyst: ['#8f8aa0', '#b56ee0', '#5e5872', '#d6c9ee'],
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
export const DISH_COLORS = {"stirfry": ["#4f9d3f", "#8fd16a"], "tomato_egg": ["#e0393e", "#f6d34a"], "carrot_egg": ["#f28b2c", "#f6d34a"], "eggplant": ["#7b3fa0", "#c8553d"], "potato_salad": ["#f2e2a0", "#f6d34a"], "corn_grill": ["#f2b33d", "#8d5d32"], "cabbage_rice": ["#f4f1e8", "#9dd17a"], "sweetpotato_congee": ["#f4efe0", "#e8913a"], "radish_soup": ["#e9e4c8", "#ffffff"], "pumpkin_soup": ["#f2a03a", "#ffffff"], "fish_braised": ["#8a4a2a", "#c96a3a"], "bass_soup": ["#e8e4d0", "#d9b44a"], "eel_rice": ["#6b3a1e", "#f4f1e8"], "pudding": ["#f6d880", "#8d5d32"], "strawberry_milk": ["#f6b6c9", "#e0393e"], "watermelon_juice": ["#f05a5a", "#4f9d3f"], "pineapple_cake": ["#e8b45a", "#f6d34a"], "niangao": ["#c98a3a", "#e8b45a"], "tangyuan": ["#f4f1e8", "#f6b6c9"], "zongzi": ["#4f7d3a", "#8fb35a"], "mooncake": ["#c98a3a", "#8d5d32"], "candy": ["#e0393e", "#f6d34a"], "cake": ["#f6efe0", "#e0393e"]};
const DISH_KIND = { plate: ['#f4f1ea', '#c9c5bf'], bowl: ['#f4f1ea', '#5a8fc8'], cup: ['#d9eef6', '#e0393e'] };
export const dishSprite = (id, shape = 'plate') => shaped('dish_' + id, DISH_SHAPES[shape] || DISH_SHAPES.plate,
  [...(DISH_COLORS[id] || ['#c8553d', '#f6d34a']), ...(DISH_KIND[shape] || DISH_KIND.plate)]);
export const fishSprite = (id) => shaped('fish_' + id, id === 'junk' ? BOOT_SHAPE : FISH_SHAPE, FISH_COLORS[id] || FISH_COLORS.tilapia);
export const oreSprite = (id) => shaped('ore_' + id, ROCK_SHAPE, ORE_COLORS[id] || ORE_COLORS.stone);

// 作物某個階段的圖：種子、發芽兩個階段每種作物長得一樣，共用小白菜那兩張
export function cropSprite(crop, stage) {
  const name = `${crop}_${stage}`;
  if (SPRITES[name]) return sprite(name);
  return sprite(stage <= 1 ? `bokchoy_${Math.max(0, stage)}` : 'bokchoy_3');
}
export const hasCropArt = (crop) => !!SPRITES[`${crop}_3`];

// 房子（4×3 格 = 64×48）：紅屋頂、米色牆、木門、兩扇窗、煙囪
export function houseSprite(ground = '#62ad4b') {
  if (cache.has('house|' + ground)) return cache.get('house|' + ground);
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
  r(ground, 4, 46, 56, 2);
  cache.set('house|' + ground, c);
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
