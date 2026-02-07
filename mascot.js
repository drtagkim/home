class Mascot {
    constructor(canvasId, masterSpriteSrc) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Single Master Sheet Logic
        this.image = new Image();
        this.image.src = masterSpriteSrc;

        this.isLoaded = false;
        this.image.onload = () => {
            this.isLoaded = true;
            console.log(`Master Mascot Loaded: ${this.image.width}x${this.image.height}`);
        };

        this.state = 'idle';
        this.reactionType = 1;
        this.reactionTimer = 0;

        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 60;
        this.numberOfFrames = 4; // 4 Columns
    }

    playReaction(lines) {
        if (!this.isLoaded) return;
        this.state = 'reaction';
        this.reactionType = Math.max(1, Math.min(lines, 4)); // 1 to 4
        this.reactionTimer = 180; // 3 seconds
        this.frameIndex = 0;
        this.ticksPerFrame = 10;
        this.draw();
    }

    update(dangerLevel, isGameOver) {
        if (!this.isLoaded) return;

        if (this.state === 'reaction') {
            this.reactionTimer--;
            if (this.reactionTimer <= 0) {
                this.state = 'idle';
            }
        } else {
            // Normal Logic
            if (isGameOver) {
                this.state = 'crying';
                this.ticksPerFrame = 15;
            } else if (dangerLevel > 0.7) {
                this.state = 'worried';
                this.ticksPerFrame = 20;
            } else {
                this.state = 'idle';
                this.ticksPerFrame = 60;
            }
        }

        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.numberOfFrames;
        }

        this.draw();
    }

    draw() {
        if (!this.isLoaded) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Map State to Row Index (0-based)
        // Row 0: Idle
        // Row 1: Worried
        // Row 2: Crying
        // Row 3: Reaction 1
        // Row 4: Reaction 2
        // Row 5: Reaction 3
        // Row 6: Reaction 4

        let row = 0;
        if (this.state === 'reaction') {
            // reactionType is 1..4
            // Map 1->3, 2->4, 3->5, 4->6
            row = 2 + this.reactionType;
        } else {
            if (this.state === 'worried') row = 1;
            else if (this.state === 'crying') row = 2;
            else row = 0; // idle
        }

        const cols = 4;
        const rows = 7; // Master sheet has 7 rows

        const fw = this.image.width / cols;
        const fh = this.image.height / rows;
        const sx = this.frameIndex * fw;
        const sy = row * fh;

        // Calculate aspect ratio to prevent stretching
        // Canvas is 120x100
        // We want to fit within roughly 100x90
        const aspectRatio = fw / fh;

        let drawH = 90;
        let drawW = drawH * aspectRatio;

        // If width exceeds max width (110), scale down by width
        if (drawW > 110) {
            drawW = 110;
            drawH = drawW / aspectRatio;
        }

        // Center horizontally
        const ox = (this.canvas.width - drawW) / 2;
        // Align to bottom 
        const oy = this.canvas.height - drawH - 5;

        this.ctx.drawImage(this.image, sx, sy, fw, fh, ox, oy, drawW, drawH);
    }
}
