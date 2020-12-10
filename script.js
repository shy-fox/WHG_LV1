class Brain {

    constructor(size) {
        this.directions = [];
        this.step = 0;
        this.randomize(size);
    }

    randomize(size) {
        for (var i = 0; i < size; i++) {
            this.directions[i] = this.getRandomDirection();
        }
    }

    getRandomDirection() {
        var randomNumber = floor(random(9));
        switch (randomNumber) {
            case 0: return createVector(0, 1);
            case 1: return createVector(1, 1);
            case 2: return createVector(1, 0);
            case 3: return createVector(1, -1);
            case 4: return createVector(0, -1);
            case 5: return createVector(-1, -1);
            case 6: return createVector(-1, 0);
            case 7: return createVector(-1, 1);
            case 8: return createVector(0, 0);
        }

        return createVector();
    }

    clone() {
        var clone = new Brain(this.directions.length);
        for (var i = 0; i < this.directions.length; i++) {
            clone.directions[i] = this.directions[i].copy();
        }
        return clone;
    }

    mutate(died, deathStep) {
        for (var i = 0; i < this.directions.length; i++) {
            var rand = random(1);
            if (died && i > deathStep - 10) rand = random(0.2);

            if (rand < mutationRate) this.directions[i] = this.getRandomDirection();
        }
    }

    increaseMoves() {
        for (var i = 0; i < increaseMovesBy; i++) {
            this.directions.push(this.getRandomDirection());
        }
    }
}

class Dot {
    constructor(t1, t2, velX) {
        this.position = createVector(t1.pixelPos.x + tileSize / 2, t1.pixelPos.y + tileSize / 2);
        this.startingPos = createVector(t1.pixelPos.x + tileSize / 2, t1.pixelPos.y / tileSize / 2);
        this.speed = floor(tileSize / 6.6);
        this.velocity = createVector(velX * this.speed, 0);
        this.startingVel = createVector(velX * this.speed, 0);
        this.bouncers = [];
        this.bouncers[0] = t1;
        this.bouncers[1] = t2;
        this.diameter = tileSize / 2.0;
        this.bounceWait = -1;
        this.bounceTimer = 10;
    }

    move() {
        for (var i = 0; i < this.bouncers.length; i++) {
            if (this.bounceTimer < 0 && dist(this.position.x, this.position.y, this.bouncers[i].pixelPos.x + tileSize / 2, this.bouncers[i].pixelPos.y + tileSize / 2) < this.speed) {
                this.bounceTimer = 10;
                this.bounceWait = 1;
            }
        }

        if (this.bounceWait == 0) {
            this.velocity.x *= 1;
        }

        this.position.add(this.velocity);
        this.bounceTimer--;
        this.bounceWait--;
    }

    show() {
        fill(0, 0, 255);
        stroke(0);
        strokeWeight(4);
        ellipse(this.position.x, this.position.y, this.diameter, this.diameter);
    }

    collides(ptl, pbr) {
        var topLeft = createVector(this.position.x - this.diameter / 2, this.position.y - this.diameter / 2);
        var bottomRight = createVector(this.position.x + this.diameter / 2, this.position.y + this.diameter / 2);
        var playerSize = bottomRight.x - topLeft.x;

        if ((ptl.x < bottomRight.x && pbr.x > topLeft.x) && (ptl.x < bottomRight.y && pbr.y > topLeft.y)) {
            if (dist(this.position.x, this.position.y, (ptl.x + pbr.x) / 2.0, (ptl.y + pbr.y) / 2.0) < this.diameter / 2 + sqrt(playerSize * playerSize * 2) / 2) {
                return true;
            }
        }

        return false;
    }

    resetDot() {
        this.position = this.startingPos.copy();
        this.velocity = this.startingVel.copy();
        this.bounceTimer = 10;
        this.bounceWait = -1;
    }

    clone() {
        var clone = new Dot(this.bouncers[0], this.bouncers[1], floor(this.velocity.x));
        clone.velocity = this.velocity.copy();
        clone.position = this.position.copy();
        clone.startingPos = this.startingPos.copy();
        clone.bounceTimer = this.bounceTimer;
        clone.bounceWait = this.bounceWait;
        return clone;
    }
}

class Node {
    constructor(nodeTile) {
        this.reached = false;
        this.distToFinish = 0.0;
        this.pos = createVector(nodeTile.pixelPos.x, nodeTile.pixelPos.y);
        this.w = tileSize;
        this.h = tileSize;
        this.bottomRight = createVector(this.pos.x + this.w, this.pos.y + this.h);
    }

    collision(ptl, pbr) {
        if ((ptl.x < this.bottomRight.x && pbr.x > this.pos.x) && (ptl.y < this.bottomRight.y && pbr.y > this.pos.y)) {
            this.reached = true;
            return true;
        }
        else if (pbr.x < this.pos.x) {
            this.reached = false;
        }
        return false;
    }

    setDistanceToFinish(n) {
        this.distToFinish = n.distToFinish + dist(this.pos.x, this.pos.y, n.pos.x, n.pos.y);
    }
}

class Player {
    constructor() {
        this.pos = createVector(3 * tileSize + xoff, 4 * tileSize + yoff);
        this.vel = createVector(0, 0);
        this.size = tileSize / 2.0;
        this.playerSpeed = tileSize / 15.0;
        this.dead = false;
        this.reachedGoal = false;
        this.fadeCounter = 255;
        this.isBest = false;
        this.deathByDot = false;
        this.deathAtStep = 0;
        this.moveCount = 0;
        this.gen = 1;
        this.fitness = 0;
        this.nodes = [];
        this.fading = false;
        this.brain = new Brain(numberOfSteps);
        this.human = false;
        this.setNodes();
    }

    setNodes() {
        this.nodes[0] = new Node(tiles[6][7]);
        this.nodes[1] = new Node(tiles[17][2]);
        this.nodes[0].setDistanceToFinish(this.nodes[1]);
    }

    show() {
        fill(255, 0, 0, this.fadeCounter);
        if (this.isBest && !showBest) fill(0, 255, 0, this.fadeCounter);
        stroke(0, 0, 0, this.fadeCounter);
        strokeWeight(4);
        rect(this.pos.x, this.pos.y, this.size, this.size);
        stroke(0);
    }

    move() {
        if (!humanPlaying) {
            if (this.moveCount == 0) {
                if (this.brain.directions.length > this.brain.step) {
                    this.vel = this.brain.directions[this.brain.step];
                    this.brain.step++;
                } else {
                    this.dead = true;
                    this.fading = true;
                }
                this.moveCount = 0;
            } else {
                this.moveCount--;
            }
        }
        var temp = createVector(this.vel.x, this.vel.y);
        temp.normalize();
        temp.mult(this.playerSpeed);
        for (var i = 0; i < solids.length; i++) temp = solids[i].restrictMovement(this.pos, createVector(this.pos.x + this.size, this.pos.y + this.size), temp);
        this.pos.add(temp);
    }

    checkCollisions() {
        for (var i = 0; i < dots.length; i++) {
            if (dots[i].collides(this.pos, createVector(this.pos.x + this.size, this.pos.y + this.size))) {
                this.fading = true;
                this.dead = true;
                this.deathByDot = true;
                this.deathAtStep = this.brain.step;
            }
        }
        if (winArea.collision(this.pos, createVector(this.pos.x + this.size, this.pos.y + this.size))) this.reachedGoal = true;
        for (var i = 0; i < this.nodes.length; i++) this.nodes[i].collision(this.pos, createVector(this.pos.x + this.size, this.pos.y + this.size));
    }

    update() {
        if (!this.dead && !this.reachedGoal) {
            this.move();
            this.checkCollisions();
        } else if (this.fading) if (this.fadeCounter > 0) if (humanPlaying || replayGames) this.fadeCounter -= 10;
        else this.fadeCounter = 0;
    }

    calculateFitness() {
        if (this.reachedGoal) this.fitness = 1.0 / 16.0 + 1000.0 / (this.brain.step * this.brain.step);
        else {
            var estimatedDist = 0.0;
            for (var i = this.nodes.length - 1; i >= 0; i--) {
                if (!this.nodes[i].reached) {
                    estimatedDist = this.nodes[i].distToFinish;
                    estimatedDist += dist(this.pos.x, this.pos.y, this.nodes[i].pos.x, this.nodes[i].pos.y);
                }
            }
            if (this.deathByDot) estimatedDist *= 0.9;
            this.fitness = 1.0 / (estimatedDist * estimatedDist);
        }
        this.fitness *= this.fitness;
    }

    createBaby() {
        var baby = new Player();
        baby.brain = this.brain.clone();
        baby.deathByDot = this.deathByDot;
        baby.deathAtStep = this.deathAtStep;
        baby.gen = this.gen;
        return baby;
    }
}

class Population {
    constructor(size) {
        this.players = [];
        this.fitnessSum = 0.0;
        this.gen = 1;
        this.bestPlayer = 0;
        this.minStep = 10000;
        this.genPlayers = [];
        this.bestFitness = 0;
        this.solutionFound = false;

        for (var i = 0; i < size; i++) {
            this.players[i] = new Player();
        }
    }

    show() {
        if (!showBest)
            for (var i = 0; i < this.players.length; i++)
                this.players[i].show();
        this.players[0].show();
    }

    update() {
        for (var i = 0; i < this.players.length; i++)
            if (this.players[i].brain.step > this.minStep) this.players[i].dead = true;
            else this.players[i].update()
    }

    calculateFitness() {
        for (var i = 0; i < this.players.length; i++) this.players[i].calculateFitness();
    }

    allPlayersDead() {
        for (var i = 0; i < this.players.length; i++) if (!this.players[i].dead && !this.players[i].reachedGoal) return false;
        return true;
    }

    naturalSelection() {
        var newPlayers = [];
        this.setBestPlayer();
        this.calculateFitnessSum();

        newPlayers[0] = this.players[this.bestPlayer].createBaby();
        newPlayers[0].isBest = true;
        for (var i = 1; i < populationSize; i++) {
            var parent = this.selectParent();
            newPlayers[i] = parent.createBaby();
        }

        this.players = [];
        for (var i = 0; i < newPlayers.length; i++) this.players[i] = newPlayers[i]
        this.gen++;
    }

    calculateFitnessSum() {
        this.fitnessSum = 0;
        for (var i = 0; i < this.players.length; i++) this.fitnessSum += this.players[i].fitness
    }

    selectParent() {
        var rand = random(this.fitnessSum);

        var runningSum = 0;

        for (var i = 0; i < this.players.length; i++) {
            runningSum += this.players[i].fitness;
            if (runningSum > rand) return this.players[i];
        }

        // hopefully never gets reached ¯\_(ツ)_/¯
        return null;
    }

    mutateBabies() {
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].brain.mutate(this.players[i].deathByDot, this.players[i].deathAtStep);
            this.players[i].deathByDot = false;
            this.players[i].gen = this.gen;
        }
        this.players[0].deathByDot = false;
        this.players[0].gen = this.gen;
    }

    setBestPlayer() {
        var max = 0;
        var maxIndex = 0;
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].fitness > max) {
                max = this.players[i].fitness;
                maxIndex = i;
            }
        }

        this.bestPlayer = maxIndex;

        if (max > this.bestFitness) {
            this.bestFitness = max;
            this.genPlayers.push(this.players[this.bestPlayer].createBaby());
        }

        if (this.players[this.bestPlayer].reachedGoal) {
            this.minStep = this.players[this.bestFitness].brain.step;
            this.solutionFound = true;
        }
    }

    increaseMoves() {
        if (this.players[0].brain.directions.length < 120 && !this.solutionFound)
            for (var i = 0; i < this.players.length; i++)
                this.players[i].brain.increaseMoves()
    }
}

class Solid {
    constructor(topL, botR) {
        var lineWidth = 1;
        this.pos = createVector(topL.pixelPos.x - lineWidth, topL.pixelPos.y - lineWidth);
        this.w = botR.pixelPos.x + tileSize - this.pos.x + lineWidth;
        this.h = botR.pixelPos.y + tileSize - this.pos.y + lineWidth;
        this.bottomRight = createVector(this.pos.x + this.w, this.pos.y + this.h);
    }

    restrictMovement(tl, br, movement) {
        var x = movement.x;
        var y = movement.y;

        var ptl = createVector(tl.x + movement.x, tl.y);
        var pbr = createVector(br.x + movement.x, br.y);

        if ((ptl.x < this.bottomRight.x && pbr.x > this.pos.x) && (ptl.x < this.bottomRight.y && pbr.y > this.pos.y)) x = 0;

        ptl = createVector(tl.x, tl.y + movement.y);
        pbr = createVector(br.x, br.y + movement.y);

        if ((ptl.x < this.bottomRight.x && pbr.x > this.pos.x) && (ptl.y < this.bottomRight.y && pbr.y > this.pos.y)) y = 0

        return createVector(x, y);
    }

    collision(ptl, pbr) {
        return ((ptl.x < this.bottomRight.x && pbr.x > this.pos.x) && (ptl.y < this.bottomRight.y && pbr.y > this.pos.y));
    }
}

class Tile {
    constructor(x, y) {
        this.matrixPos = createVector(x, y);
        this.pixelPos = createVector(x * tileSize + xoff, y * tileSize + yoff);
        this.safe = false;
        this.goal = false;
        this.wall = false;
        this.edges = [];
    }

    show() {
        if ((this.matrixPos.x + this.matrixPos.y) % 2 == 0) fill(247, 247, 255);
        else fill(230, 230, 255);
        if (this.goal || this.safe) fill(181, 254, 180);
        noStroke();
        rect(this.pixelPos.x, this.pixelPos.y, tileSize, tileSize);
    }

    showEdges() {
        for (var i = 0; i < this.edges.length; i++) {
            stroke(0);
            strokeWeight(4);
            switch (this.edges[i]) {
                case 4:
                    line(this.pixelPos.x, this.pixelPos.y, this.pixelPos.x + tileSize, this.pixelPos.y);
                    break;
                case 1:
                    line(this.pixelPos.x + tileSize, this.pixelPos.y, this.pixelPos.x + tileSize, this.pixelPos.y + tileSize);
                    break;
                case 2:
                    line(this.pixelPos.x, this.pixelPos.y + tileSize, this.pixelPos.x + tileSize, this.pixelPos.y + tileSize);
                    break;
                case 3:
                    line(this.pixelPos.x, this.pixelPos.y, this.pixelPos.x, this.pixelPos.y + tileSize);
                    break;
            }
        }
    }
}

function setLevelWalls() {
    tiles[0][0].wall = true;
    tiles[0][1].wall = true;
    tiles[0][2].wall = true;
    tiles[0][3].wall = true;
    tiles[0][4].wall = true;
    tiles[0][5].wall = true;
    tiles[0][6].wall = true;
    tiles[0][7].wall = true;
    tiles[0][8].wall = true;
    tiles[0][9].wall = true;
    tiles[1][0].wall = true;
    tiles[1][1].wall = true;
    tiles[1][2].wall = true;
    tiles[1][3].wall = true;
    tiles[1][4].wall = true;
    tiles[1][5].wall = true;
    tiles[1][6].wall = true;
    tiles[1][7].wall = true;
    tiles[1][8].wall = true;
    tiles[1][9].wall = true;
    tiles[2][0].wall = true;
    tiles[2][1].wall = true;
    tiles[2][8].wall = true;
    tiles[2][9].wall = true;
    tiles[3][0].wall = true;
    tiles[3][1].wall = true;
    tiles[3][8].wall = true;
    tiles[3][9].wall = true;
    tiles[4][0].wall = true;
    tiles[4][1].wall = true;
    tiles[4][8].wall = true;
    tiles[4][9].wall = true;
    tiles[5][0].wall = true;
    tiles[5][1].wall = true;
    tiles[5][2].wall = true;
    tiles[5][3].wall = true;
    tiles[5][4].wall = true;
    tiles[5][5].wall = true;
    tiles[5][6].wall = true;
    tiles[5][8].wall = true;
    tiles[5][9].wall = true;
    tiles[6][0].wall = true;
    tiles[6][1].wall = true;
    tiles[6][2].wall = true;
    tiles[6][8].wall = true;
    tiles[6][9].wall = true;
    tiles[7][0].wall = true;
    tiles[7][1].wall = true;
    tiles[7][2].wall = true;
    tiles[7][7].wall = true;
    tiles[7][8].wall = true;
    tiles[7][9].wall = true;
    tiles[8][0].wall = true;
    tiles[8][1].wall = true;
    tiles[8][2].wall = true;
    tiles[8][7].wall = true;
    tiles[8][8].wall = true;
    tiles[8][9].wall = true;
    tiles[9][0].wall = true;
    tiles[9][1].wall = true;
    tiles[9][2].wall = true;
    tiles[9][7].wall = true;
    tiles[9][8].wall = true;
    tiles[9][9].wall = true;
    tiles[10][0].wall = true;
    tiles[10][1].wall = true;
    tiles[10][2].wall = true;
    tiles[10][7].wall = true;
    tiles[10][8].wall = true;
    tiles[10][9].wall = true;
    tiles[11][0].wall = true;
    tiles[11][1].wall = true;
    tiles[11][2].wall = true;
    tiles[11][7].wall = true;
    tiles[11][8].wall = true;
    tiles[11][9].wall = true;
    tiles[12][0].wall = true;
    tiles[12][1].wall = true;
    tiles[12][2].wall = true;
    tiles[12][7].wall = true;
    tiles[12][8].wall = true;
    tiles[12][9].wall = true;
    tiles[13][0].wall = true;
    tiles[13][1].wall = true;
    tiles[13][2].wall = true;
    tiles[13][7].wall = true;
    tiles[13][8].wall = true;
    tiles[13][9].wall = true;
    tiles[14][0].wall = true;
    tiles[14][1].wall = true;
    tiles[14][2].wall = true;
    tiles[14][7].wall = true;
    tiles[14][8].wall = true;
    tiles[14][9].wall = true;
    tiles[15][0].wall = true;
    tiles[15][1].wall = true;
    tiles[15][7].wall = true;
    tiles[15][8].wall = true;
    tiles[15][9].wall = true;
    tiles[16][0].wall = true;
    tiles[16][1].wall = true;
    tiles[16][3].wall = true;
    tiles[16][4].wall = true;
    tiles[16][5].wall = true;
    tiles[16][6].wall = true;
    tiles[16][7].wall = true;
    tiles[16][8].wall = true;
    tiles[16][9].wall = true;
    tiles[17][0].wall = true;
    tiles[17][1].wall = true;
    tiles[17][8].wall = true;
    tiles[17][9].wall = true;
    tiles[18][0].wall = true;
    tiles[18][1].wall = true;
    tiles[18][8].wall = true;
    tiles[18][9].wall = true;
    tiles[19][0].wall = true;
    tiles[19][1].wall = true;
    tiles[19][8].wall = true;
    tiles[19][9].wall = true;
    tiles[20][0].wall = true;
    tiles[20][1].wall = true;
    tiles[20][2].wall = true;
    tiles[20][3].wall = true;
    tiles[20][4].wall = true;
    tiles[20][5].wall = true;
    tiles[20][6].wall = true;
    tiles[20][7].wall = true;
    tiles[20][8].wall = true;
    tiles[20][9].wall = true;
    tiles[21][0].wall = true;
    tiles[21][1].wall = true;
    tiles[21][2].wall = true;
    tiles[21][3].wall = true;
    tiles[21][4].wall = true;
    tiles[21][5].wall = true;
    tiles[21][6].wall = true;
    tiles[21][7].wall = true;
    tiles[21][8].wall = true;
    tiles[21][9].wall = true;
}

function setLevelGoal() {
    tiles[17][2].goal = true;
    tiles[17][3].goal = true;
    tiles[17][4].goal = true;
    tiles[17][5].goal = true;
    tiles[17][6].goal = true;
    tiles[17][7].goal = true;
    tiles[18][2].goal = true;
    tiles[18][3].goal = true;
    tiles[18][4].goal = true;
    tiles[18][5].goal = true;
    tiles[18][6].goal = true;
    tiles[18][7].goal = true;
    tiles[19][2].goal = true;
    tiles[19][3].goal = true;
    tiles[19][4].goal = true;
    tiles[19][5].goal = true;
    tiles[19][6].goal = true;
    tiles[19][7].goal = true;
}

function setLevelSafeArea() {
    tiles[2][2].safe = true;
    tiles[2][3].safe = true;
    tiles[2][4].safe = true;
    tiles[2][5].safe = true;
    tiles[2][6].safe = true;
    tiles[2][7].safe = true;
    tiles[3][2].safe = true;
    tiles[3][3].safe = true;
    tiles[3][4].safe = true;
    tiles[3][5].safe = true;
    tiles[3][6].safe = true;
    tiles[3][7].safe = true;
    tiles[4][2].safe = true;
    tiles[4][3].safe = true;
    tiles[4][4].safe = true;
    tiles[4][5].safe = true;
    tiles[4][6].safe = true;
    tiles[4][7].safe = true;
}

function setEdges() {
    for (var i = 1; i < tiles.length - 1; i++) {
        for (var j = 1; j < tiles[0].length - 1; j++) {
            if (tiles[i][j].wall) {
                if (!tiles[i + 1][j].wall) tiles[i][j].edges.push(1);
                if (!tiles[i][j + 1].wall) tiles[i][j].edges.push(2);
                if (!tiles[i - 1][j].wall) tiles[i][j].edges.push(3);
                if (!tiles[i][j - 1].wall) tiles[i][j].edges.push(4);
            }
        }
    }
}

function setDots() {
    dots.push(new Dot(tiles[6][3], tiles[15][3], 1));
    dots.push(new Dot(tiles[6][5], tiles[15][5], 1));
    dots.push(new Dot(tiles[15][4], tiles[6][4], -1));
    dots.push(new Dot(tiles[15][6], tiles[6][6], -1));
}

function setSolids() {
    solids.push(new Solid(tiles[1][1], tiles[1][8]));
    solids.push(new Solid(tiles[1][1], tiles[5][1]));
    solids.push(new Solid(tiles[5][1], tiles[5][6]));
    solids.push(new Solid(tiles[1][8], tiles[7][8]));
    solids.push(new Solid(tiles[7][7], tiles[15][8]));
    solids.push(new Solid(tiles[16][3], tiles[16][8]));
    solids.push(new Solid(tiles[16][8], tiles[20][8]));
    solids.push(new Solid(tiles[20][1], tiles[21][8]));
    solids.push(new Solid(tiles[14][1], tiles[20][1]));
    solids.push(new Solid(tiles[5][2], tiles[14][2]));
}

// actual sketch

var tileSize = 50;
var xoff = 80;
var yoff = 100;

var humanPlaying = false;
var left = false;
var right = false;
var up = false;
var down = false;
var p;

var tiles = [];
var solids = [];
var dots = [];
var savedDots = [];

var showBest = false;

var winArea;

var replayGens = false;
var genPlayer;
var upToGenPos = 0;

var numberOfSteps = 10;
var testPopulation;

var winCounter = -1;

var populationSize = 500;
var popPara;
var popPlus;
var popMinus;

var mutationRate = 0.01;
var mrPara;
var mrPlus;
var mrMinus;

var evolutionSpeed = 1;
var speedPara;
var speedPlus;
var speedMinus;

var movesH3;

var increaseMovesBy = 5;
var movesPara;
var movesPlus;
var movesMinus;

var increaseEvery = 5;
var everyPara;
var everyPlus;
var everyMinus;

function setup() {
    createCanvas(1280, 720);
    htmlStuff();
    for (var i = 0; i < 22; i++) {
        tiles[i] = [];
        for (var j = 0; j < 10; j++) tiles[i][j] = new Tile(i, j);
    }

    setLevelWalls();
    setLevelGoal();
    setLevelSafeArea();
    setEdges();
    setSolids();

    p = new Player();
    setDots();
    winArea = new Solid(tiles[17][2], tiles[19][7]);
    testPopulation = new Population(populationSize);

    window.addEventListener("keydown", e => {
        if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) e.preventDefault();
    }, false);
}

function draw() {
    background(180, 181, 254);
    drawTiles();
    write();

    if (humanPlaying) {
        if ((p.dead && p.fadeCounter <= 0) || p.reachedGoal) {
            if (p.reachedGoal) winCounter = 100;
            p = new Player();
            p.human = true;
            resetDots();
        } else {
            moveAndShowDots();
            p.update();
            p.show();
        }
    } else {
        if (replayGens) {
            if ((genPlayer.dead && genPlayer.fadeCounter <= 0) || genPlayer.reachedGoal) {
                upToGenPos++;
                if (testPopulation.genPlayers.length <= upToGenPos) {
                    upToGenPos = 0;
                    replayGens = false;
                    loadDots();
                } else {
                    genPlayer = testPopulation.genPlayers[upToGenPos].createBaby();
                    resetDots();
                }
            } else {
                moveAndShowDots();
                genPlayer.update();
                genPlayer.show();
            }
        } else {
            if (testPopulation.allPlayersDead()) {
                testPopulation.calculateFitness();
                testPopulation.naturalSelection();
                testPopulation.mutateBabies();
                resetDots();

                if (testPopulation.gen % increaseEvery == 0) testPopulation.increaseMoves();
            } else {
                for (var j = 0; j < evolutionSpeed; j++) {
                    for (var i = 0; i < dots.length; i++) {
                        dots[i].move();
                    }
                    testPopulation.update();
                }

                for (var i = 0; i < dots.length; i++) {
                    dots[i].show();
                }
                testPopulation.show();
            }
        }
    }
}

function moveAndShowDots() {
    for (var i = 0; i < dots.length; i++) {
        dots[i].move();
        dots[i].show();
    }
}

function resetDots() {
    for (var i = 0; i < dots.length; i++) dots[i].resetDot();
}

function drawTiles() {
    for (var i = 0; i < tiles.length; i++) for (var j = 0; j < tiles[0].length; j++) tiles[i][j].show();
    for (var i = 0; i < tiles.length; i++) for (var j = 0; j < tiles[0].length; j++) tiles[i][j].showEdges();
}

function loadDots() {
    for (var i = 0; i < dots.length; i++) dots[i] = savedDots[i].clone();
}

function saveDots() {
    for (var i = 0; i < dots.length; i++) savedDots[i] = dots[i].clone();
}

function write() {
    fill(247, 247, 255);
    textSize(20);
    noStroke();
    text(" \tPress 'P' to play the game yourself. \t\t\t\t\t\t\t Press 'G' to replay evolution hightlights.", 250, 620);
    text("Press 'SPACE' to only show the best player.", 450, 680);
    if (winCounter > 0) {
        textSize(100);
        stroke(0);
        text("WOOOOOOOOOOOO!", 110, 400);
        winCounter--;
        textSize(36);
        noStroke();
    }

    if (replayGens) {
        text(`Generation : ${genPlayer.gen}`, 200, 90);
        text(`Number of moves: ${genPlayer.brain.directions.length}`, 700, 90);
    } else if (!humanPlaying) {
        text(`Generation: ${testPopulation.gen}`, 200, 90);
        if (testPopulation.solutionFound) text(`Wins in ${testPopulation.minStep} moves.`, 700, 90);
        else text(`Number of moves: ${testPopulation.players[0].brain.directions.length}`, 700, 90);
    } else text("Have fun ;)", 500, 90);
}

function keyPressed() {
    if (humanPlaying) {
        switch (keyCode) {
            case UP_ARROW:
                up = true;
                break;
            case DOWN_ARROW:
                down = true;
                break;
            case RIGHT_ARROW:
                right = true;
                break;
            case LEFT_ARROW:
                left = true;
                break;
        }
        switch (key) {
            case 'W':
                up = true;
                break;
            case 'S':
                down = true;
                break;
            case 'D':
                right = true;
                break;
            case 'A':
                left = true;
                break;
        }

        setPlayerVelocity();
    } else {
        switch (key) {
            case ' ':
                showBest = !showBest;
                break;
            case 'G':
                if (replayGens) {
                    upToGenPos = 0;
                    replayGens = false;
                    loadDots();
                } else {
                    if (testPopulation.genPlayers.length > 0) {
                        replayGens = true;
                        genPlayer = testPopulation.genPlayers[0].createBaby();
                        saveDots();
                        resetDots();
                    }
                }
                break;
        }

        if (key == 'P') {
            if (humanPlaying) {
                humanPlaying = false;
                loadDots();
            } else {
                if (replayGens) {
                    upToGenPos = 0;
                    replayGens = false;
                }
                humanPlaying = true;
                p = new Player();
                p.human = true;
                saveDots();
                resetDots();
            }
        }
    }
}

function keyReleased() {
    if (humanPlaying) {
        switch (keyCode) {
            case UP_ARROW:
                up = false;
                break;
            case DOWN_ARROW:
                down = false;
                break;
            case RIGHT_ARROW:
                right = false;
                break;
            case LEFT_ARROW:
                left = false;
                break;
        }

        switch (key) {
            case 'W':
                up = false;
                break;
            case 'S':
                down = false;
                break;
            case 'D':
                right = false;
                break;
            case 'A':
                left = false;
                break;
        }

        setPlayerVelocity();
    }
}

function setPlayerVelocity() {
    p.vel.y = 0;
    if (up) p.vel.y -= 1;
    if (down) p.vel.y += 1;
    p.vel.x = 0;
    if (left) p.vel.x -= 1;
    if (right) p.vel.x += 1;
}

function htmlStuff() {
    createElement("h2", "Change Values");
    createP("Here are some values you can play with.");

    popPara = createDiv(`Population Size: ${populationSize}`);
    popMinus = createButton("-");
    popPlus = createButton("+");

    popMinus.mousePressed(() => {
        if (populationSize > 100) {
            populationSize -= 100;
            popPara.html(`Population Size: ${populationSize}`);
        }
    });
    popMinus.mousePressed(() => {
        if (populationSize < 10000) {
            populationSize += 100;
            popPara.html(`Population Size: ${populationSize}`);
        }
    });

    mrPara = createDiv(`Mutation Rate: ${mutationRate}`);
    mrMinus = createButton("-");
    mrPlus = createButton("+");

    mrMinus.mousePressed(() => {
        if (mutationRate > 0.0001) {
            mutationRate /= 2.0;
            mrPara.html(`Mutation Rate: ${mutationRate}`);
        }
    });
    mrPlus.mousePressed(() => {
        if (mutationRate <= 0.5) {
            mutationRat *= 2.0;
            mrPara.html(`Mutation Rate: ${mutationRate}`);
        }
    });

    speedPara = createDiv(`Evolution Player Speed: ${evolutionSpeed}`);
    speedMinus = createButton("-");
    speedPlus = createButton("+");

    speedMinus.mousePressed(() => {
        if (evolutionSpeed > 1) {
            evolutionSpeed -= 1;
            speedPara.html(`Evolution Player Speed: ${evolutionSpeed}`);
        }
    });
    speedPlus.mousePressed(() => {
        if (evolutionSpeed <= 5) {
            evolutionSpeed += 1;
            speedPara.html(`Evolution Player Speed: ${evolutionSpeed}`);
        }
    });

    movesH3 = createElement("h3", `Increase number of player moves by ${increaseMovesBy} every ${increaseEvery} generations.`);
    movesPara = createDiv(`Increases moves by: ${increaseMovesBy}`);
    movesMinus = createButton("-");
    movesPlus = createButton("+");
    everyPara = createDiv(`Increase every ${increaseEvery} generations.`);
    everyMinus = createButton("-");
    everyPlus = createButton("+");

    movesPlus.mousePressed(() => {
        if (increaseMovesBy >= 1) {
            increaseMovesBy -= 1;
            movesPara.html(`Increase moves by: ${increaseMovesBy}`);
            movesH3.html(`Increase number of player moves by ${increaseMovesBy} every ${increaseEvery} generations.`);
        }
    });
    movesMinus.mousePressed(() => {
        if (increaseMovesBy <= 500) {
            increaseMovesBy += 1;
            movesPara.html(`Increase moves by: ${increaseMovesBy}`);
            movesH3.html(`Increase number of player moves by ${increaseMovesBy} every ${increaseEvery} generations.`);
        }
    });
    everyMinus.mousePressed(() => {
        if (increaseEvery > 1) {
            increaseEvery -= 1;
            movesPara.html(`Increase moves by: ${increaseMovesBy}`);
            movesH3.html(`Increase number of player moves by ${increaseMovesBy} every ${increaseEvery} generations.`);
        }
    });
    everyPlus.mousePressed(() => {
        if (increaseEvery <= 100) {
            increaseEvery += 1;
            movesPara.html(`Increase moves by: ${increaseMovesBy}`);
            movesH3.html(`Increase number of player moves by ${increaseMovesBy} every ${increaseEvery} generations.`);
        }
    });
}
