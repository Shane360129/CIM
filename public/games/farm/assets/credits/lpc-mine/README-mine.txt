
The crane boom can be rotated to four positions: 0° (3 o'clock), -30° (4 o'clock), -60° (5 o'clock) to -90° (6 o'clock). At each position, the sprite can be animated to show the bucket going up and down. Several spritesheets need to be arranged in order to accomplish this. Layer the these sprites in the following order bottom to top.

- Crane boom shadow: 512 x 512px tiles, `crane-top-shadow.png`
	- Top-left corner of `crane-top-shadow.png` should be 192px below the top-left corner of `crane-top.png`
- Crane palette or bucket shadow: 64 x 64px in `mine.png`
	- Place the top left corner of the shadow at one of the following positions (px right, px down) compared to the top-left corner of `crane-top.png`, depending on what angle the boom is pointing:
	-   0°: 32*12=384px right, 32*13=416px down
	- -30°: 32*11=352px right, 32*15=480px down
	- -60°: 32*9 =288px right, 32*16=512px down
	- -90°: 32*7 =224px right, 32*16=512px down
- Crane body: (7*32 = 224) x (4 * 32 = 128) px tiles in top-left corner of `mine.png`
	- Top-left corner of `mine.png` should be 192px to the right and 256px below the top-left corner of `crane-top.png`
	- play *right-to-left* to show the crane bucket raising, left-to-right to show the crane bucket lowering
- Rope: 4 x 4px tiles, tiled vertically as necessary, `rope.png`
	- Place the top left corner of the first tile of `rope.png` at one of the following positions (px right, px down) compared to the top-left corner of `crane-top.png`, depending on what angle the boom is pointing. Tile the rope sprite vertically down to the position of the bucket.
		-   0°: 423 px right, 259 px down
		- -30°: 381 px right, 308 px down
		- -60°: 317 px right, 330 px down
		- -90°: 254 px right, 357 px down
	- play left to right for the basket raising, or right-to-left for it lowering
- Crane palette or bucket, cargo, and rope: left side of `mine.png`
	- Palette/bucket are 64x64px
	- Cargo are 64 x 64px, bottom of `mine.png`
	- Rope is 64 x 96px. Top-left corner of the ropes should be placed 32px above the top-left corner of the bucket/palette. 
	- Place the left edge of the cargo-palette/bucket-rope at one of the following positions (px right, px down) compared to the left edge of `crane-top.png`, depending on what angle the boom is pointing; raise or lower vertically as desired:
		-   0°: 32*12=384px right
		- -30°: 32*11=352px right
		- -60°: 32*9 =288px right
		- -90°: 32*7 =224px right
- Crane boom: 512 x 512px tiles, `crane-top.png`

There is a rough example of all this in the Tiled <https://www.mapeditor.org> map `mine.tmx`. I can't show the movement of the bucket/rope in Tiled, but hopefully you get the idea.