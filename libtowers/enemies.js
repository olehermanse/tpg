const { limit } = require("./utils.js");

class Enemy {
  static cost = 2;

  reward() {
    return this.__proto__.constructor.cost;
  }

  constructor(c, r, path) {
    this.c = c;
    this.r = r;
    this.color = "#ff0000";
    this.rotation = 0;
    this.target_rotation = 0;
    this.health = 100.0;
    this.max_health = this.health;
    this.path = path;
    this.path_index = 0;
    this.slow = 0.0;
    this.slow_time = 0.0;
    this.speed = 2.0;
    this.travelled = 0.0;
    this.delay = 1.0 / this.speed;
  }

  effective_speed() {
    return this.speed * (1 - this.slow * 0.5);
  }

  tick(ms) {
    const sec = ms / 1000.0;
    this.slow_time -= sec;
    if (this.slow_time < 0.0) {
      this.slow_time = 0.0;
      this.slow = 0.0;
    } else if (this.slow > 1.0) {
      this.slow = 1.0;
    }

    if (this.rotation != this.target_rotation) {
      return this.update_rotation(ms);
    }

    const speed = this.effective_speed();
    const step = speed * sec;
    if (this.path_index >= this.path.length) {
      this.path_index = this.path.length - 1;
    }
    const target = this.path[this.path_index];
    const dx = target.c - this.c;
    const dy = target.r - this.r;
    if (
      Math.abs(dx) < step &&
      Math.abs(dy) < step &&
      this.path_index + 1 < this.path.length
    ) {
      this.path_index += 1;
    }
    if (Math.abs(dx) > step) {
      this.c += step * Math.sign(dx);
      this.travelled += step;
      if (Math.sign(dx) > 0.0) {
        this.target_rotation = 0.0;
      } else {
        this.target_rotation = Math.PI;
      }
    } else {
      this.c = target.c;
    }
    if (Math.abs(dy) > step) {
      this.r += step * Math.sign(dy);
      this.travelled += step;
      if (Math.sign(dy) > 0.0) {
        this.target_rotation = (3 * Math.PI) / 2;
      } else {
        this.target_rotation = Math.PI / 2;
      }
    } else {
      this.r = target.r;
    }
  }

  update_rotation(ms) {
    console.assert(this.rotation != this.target_rotation);
    const sec = ms / 1000;
    const speed = this.effective_speed() * 2.0 * 2 * Math.PI;
    const step = speed * sec;
    const delta = this.target_rotation - this.rotation;
    let difference = Math.abs(delta);
    let direction = Math.sign(delta);
    if (difference > Math.PI) {
      difference = 2 * Math.PI - difference;
      direction = -1 * direction;
    }
    if (difference <= step) {
      this.rotation = this.target_rotation;
      return;
    }
    this.rotation += step * direction;
    if (this.rotation < 0) {
      this.rotation += 2 * Math.PI;
    }
  }
}

class Speedy extends Enemy {
  static cost = 4;

  constructor(c, r, path) {
    super(c, r, path);
    this.speed = this.speed * 2;
    this.color = "#ffff00";
    this.health = 150.0;
    this.max_health = this.health;
    this.delay = this.delay / 2;
  }
}

class Boss extends Enemy {
  static cost = 50;

  constructor(c, r, path) {
    super(c, r, path);
    this.speed = this.speed / 2;
    this.color = "#000000";
    this.health = 6000.0;
    this.max_health = this.health;
    this.delay = this.delay * 2;
  }
}

class Purple extends Enemy {
  static cost = 50;

  constructor(c, r, path) {
    super(c, r, path);
    this.color = "#880088";
    this.health = 4000.0;
    this.max_health = this.health;
    this.delay = this.delay;
  }
}

class Mega extends Enemy {
  static cost = 100;

  constructor(c, r, path) {
    super(c, r, path);
    this.speed = this.speed / 1.5;
    this.color = "#ffffff";
    this.health = 40000.0;
    this.max_health = this.health;
    this.delay = this.delay * 1.5;
  }
}

class Enemies {
  static specific(mob, n, c, r, path) {
    let enemies = [];
    for (let i = 0; i < n; ++i) {
      enemies.push(new mob(c, r, path));
    }
    return enemies;
  }

  static create(c, r, level, lives, path) {
    let few = null;
    let many = null;
    if (level <= 4) {
      return this.specific(Enemy, level, c, r, path);
    } else if (level < 10) {
      return [
        ...this.specific(Speedy, 1 + (level % 5), c, r, path),
        ...this.specific(Enemy, level, c, r, path),
      ];
    }
    if (level == 10) {
      return this.specific(Boss, 1, c, r, path);
    }
    if (level < 15) {
      return this.specific(Speedy, level, c, r, path);
    }
    if (level < 20) {
      return this.specific(Purple, 1 + (level % 5), c, r, path);
    }
    if (level == 20) {
      return this.specific(Boss, 6, c, r, path);
    }
    if (level < 25) {
      return [
        ...this.specific(Boss, 6 + (level % 5), c, r, path),
        ...this.specific(Purple, 1 + (level % 5), c, r, path),
      ];
    }
    if (level == 25) {
      return this.specific(Boss, 14, c, r, path);
    }
    if (level == 26) {
      return this.specific(Purple, 14, c, r, path);
    }
    if (level <= 30) {
      let enemies = [];
      while (enemies.length < level) {
        if (enemies.length % 2 === 0)
          enemies.push(...this.specific(Boss, 1, c, r, path));
        else
          enemies.push(...this.specific(Purple, 1, c, r, path));
      }
      return enemies;
    }
    if (level < 40) {
      return this.specific(Mega, 1 + level % 10, c, r, path);
    }
    return this.specific(Mega, level, c, r, path);
  }
}

module.exports = {
  Enemies,
};
