const Draw = require("./draw.js");

class UIText {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.text = "0";
    }

    draw(ctx) {
        ctx.font = '48px monospace';
        ctx.textAlign = "center";
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText(this.text, this.x, this.y);
    }
}

class UI {
    constructor(x, y, w, h, bg, fg) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.bg = bg;
        this.fg = fg;
        this.c = bg;
        this.children = [];
    }

    setup() {
        this.add_inner(this.h / 5, this.fg);
        this.add_text();
    }

    add_inner(padding, color) {
        const x = this.x + padding;
        const y = this.y + padding;
        const w = this.w - 2 * padding;
        const h = this.h - 2 * padding;
        const inner = new UI(x, y, w, h, color);
        this.children.push(inner);
    }

    add_text() {
        const text = new UIText(this.x + this.w / 2, this.y + this.h / 2);
        this.text = text;
        this.children.push(text);
    }

    draw_self(ctx) {
        Draw.rectangle(ctx, this.x, this.y, this.w, this.h, this.c);
    }

    draw(ctx) {
        this.draw_self(ctx);
        this.children.map((c) => { c.draw(ctx); });
    }
}

module.exports = {
    UI,
};