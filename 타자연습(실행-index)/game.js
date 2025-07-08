class Word {
    constructor(text, x, y, speed) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.popping = false;
        // 동적으로 배경 너비 계산
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = 'bold 24px "Noto Sans KR"';
        const textWidth = tempCtx.measureText(this.text).width;
        this.rectW = Math.max(120, textWidth + 40); // 최소 120, 좌우 여백 20씩
        this.rectH = 50;
        this.popOpacity = 1;
        this.puzzlePieces = [];
        this.puzzleStarted = false;
        this.puzzleCount = 8;
    }

    update() {
        if (!this.popping) {
            this.y += this.speed;
        } else {
            this.popOpacity -= 0.05;
            if (!this.puzzleStarted) {
                this.startPuzzleScatter();
                this.puzzleStarted = true;
            }
            this.puzzlePieces.forEach(piece => {
                piece.x += piece.vx;
                piece.y += piece.vy;
                piece.vx *= 0.97;
                piece.vy += 0.2;
                piece.angle += piece.vAngle;
                piece.opacity -= 0.04;
            });
            this.puzzlePieces = this.puzzlePieces.filter(p => p.opacity > 0);
        }
    }

    draw(ctx) {
        if (!this.popping) {
            // 둥근 직사각형 배경
            ctx.save();
            ctx.globalAlpha = this.popOpacity;
            ctx.fillStyle = '#f5e6c8';
            ctx.strokeStyle = '#e0cfa0';
            ctx.lineWidth = 2;
            this.drawRoundedRect(ctx, this.x, this.y, this.rectW, this.rectH, 16);
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            // 단어
            ctx.save();
            ctx.fillStyle = '#111';
            ctx.font = 'bold 24px "Noto Sans KR"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = this.popOpacity;
            ctx.shadowColor = 'rgba(255,255,255,0.2)';
            ctx.shadowBlur = 2;
            ctx.fillText(this.text, this.x + this.rectW / 2, this.y + this.rectH / 2);
            ctx.restore();
        } else {
            // 퍼즐 파편 그리기
            this.puzzlePieces.forEach(piece => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, piece.opacity);
                ctx.translate(piece.x + piece.w/2, piece.y + piece.h/2);
                ctx.rotate(piece.angle);
                ctx.translate(-piece.w/2, -piece.h/2);
                ctx.fillStyle = '#f5e6c8';
                ctx.strokeStyle = '#e0cfa0';
                ctx.lineWidth = 2;
                this.drawRoundedRect(ctx, 0, 0, piece.w, piece.h, 8);
                ctx.stroke();
                ctx.fill();
                ctx.restore();
            });
        }
    }

    pop() {
        this.popping = true;
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    startPuzzleScatter() {
        // 8조각(2x4)로 분할
        const rows = 2, cols = 4;
        const pieceW = this.rectW / cols;
        const pieceH = this.rectH / rows;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const px = this.x + col * pieceW;
                const py = this.y + row * pieceH;
                const angle = Math.atan2(py + pieceH/2 - (this.y + this.rectH/2), px + pieceW/2 - (this.x + this.rectW/2));
                const speed = 2 + Math.random() * 1.5;
                this.puzzlePieces.push({
                    x: px,
                    y: py,
                    w: pieceW,
                    h: pieceH,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    angle: 0,
                    vAngle: (Math.random() - 0.5) * 0.2,
                    opacity: 1
                });
            }
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.input = document.getElementById('input');
        this.scoreElement = document.getElementById('score');
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'baby_custom.jpg';
        this.backgroundImage.onload = () => {
            this.backgroundReady = true;
        };
        this.congratsImage = new Image();
        this.congratsImage.src = 'baby_custom2.png';
        this.congratsImageReady = false;
        this.congratsImage.onload = () => {
            this.congratsImageReady = true;
        };
        this.bgm = new Audio('congrats_bgm.mp3');
        this.bgmPlayed = false;
        this.words = [];
        this.score = 0;
        this.backgroundProgress = 0;
        this.transitioning = false;
        this.transitionAlpha = 0;
        this.transitionComplete = false;
        this.wordList = [
            '결혼장려', '육아지원 강화', '교육환경개선', '여성 경력 유지 지원', '저렴한 주택 공급', '경제 안정', '일-가정 양립 문화 조성', '다자녀 혜택 확대', 
            '사회적 인식 개선', '이민 정책 완화', '건강한 출산 환경 조성', '가족 중심 가치관 확산', '청년 세대 지원 강화', '출산 휴가 및 육아 휴직 확대', '공동체 의식 함양'
        ];
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.checkWord();
            }
        });
        this.gameLoop();
        this.spawnAllowed = true;
        this.spawnWord();
    }

    drawBackground() {
        const gradient = this.backgroundCtx.createLinearGradient(0, 0, 0, this.backgroundCanvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#2d2d2d');
        this.backgroundCtx.fillStyle = gradient;
        this.backgroundCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        const segmentHeight = this.backgroundCanvas.height / 10;
        const visibleHeight = segmentHeight * this.backgroundProgress;
        if (this.backgroundReady && visibleHeight > 0) {
            const canvasW = this.backgroundCanvas.width;
            const canvasH = this.backgroundCanvas.height;
            const imgW = this.backgroundImage.width;
            const imgH = this.backgroundImage.height;
            const scale = Math.max(canvasW / imgW, canvasH / imgH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            const dx = (canvasW - drawW) / 2;
            const dy = (canvasH - drawH) / 2;
            this.backgroundCtx.save();
            this.backgroundCtx.beginPath();
            this.backgroundCtx.rect(0, 0, canvasW, visibleHeight);
            this.backgroundCtx.clip();
            this.backgroundCtx.globalAlpha = 1.0;
            this.backgroundCtx.drawImage(
                this.backgroundImage,
                dx, dy, drawW, drawH
            );
            this.backgroundCtx.restore();
        }
        // 배경 전환 효과 (contain 방식)
        if (this.transitioning && this.congratsImageReady) {
            this.transitionAlpha += 0.02;
            if (this.transitionAlpha > 1) {
                this.transitionAlpha = 1;
                this.transitionComplete = true;
            }
            const canvasW = this.backgroundCanvas.width;
            const canvasH = this.backgroundCanvas.height;
            const imgW = this.congratsImage.width;
            const imgH = this.congratsImage.height;
            // contain 방식 비율 계산
            const scale = Math.min(canvasW / imgW, canvasH / imgH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            const dx = (canvasW - drawW) / 2;
            const dy = (canvasH - drawH) / 2;
            this.backgroundCtx.save();
            this.backgroundCtx.globalAlpha = this.transitionAlpha;
            this.backgroundCtx.drawImage(
                this.congratsImage,
                dx, dy, drawW, drawH
            );
            this.backgroundCtx.restore();
        }
    }

    spawnWord() {
        if (!this.spawnAllowed) return;
        // 단어 객체를 미리 만들어서 rectW를 구함
        const text = this.wordList[Math.floor(Math.random() * this.wordList.length)];
        const tempWord = new Word(text, 0, 0, 0.5 + Math.random() * 0.7);
        const maxX = this.canvas.width - tempWord.rectW - 20;
        const x = Math.random() * maxX;
        const speed = 0.5 + Math.random() * 0.7;
        this.words.push(new Word(text, x, 0, speed));
        setTimeout(() => this.spawnWord(), 3000); // 3초마다 단어 생성
    }

    checkWord() {
        if (!this.spawnAllowed) return;
        const inputText = this.input.value;
        const wordIndex = this.words.findIndex(word => word.text === inputText && !word.popping);
        if (wordIndex !== -1) {
            const word = this.words[wordIndex];
            word.pop();
            setTimeout(() => {
                this.words = this.words.filter(w => w !== word);
            }, 500);
            this.score += 10;
            this.scoreElement.textContent = `점수: ${this.score}`;
            this.input.value = '';
            this.backgroundProgress = Math.min(10, this.score / 10);
            if (this.backgroundProgress === 10 && !this.transitioning) {
                this.transitioning = true;
                this.transitionAlpha = 0;
                if (!this.bgmPlayed) {
                    this.bgm.play();
                    this.bgmPlayed = true;
                }
                this.spawnAllowed = false;
            }
        }
    }

    update() {
        if (!this.transitionComplete) {
            this.words.forEach(word => word.update());
            this.words = this.words.filter(word => 
                word.y < this.canvas.height && 
                (!word.popping || word.popOpacity > 0)
            );
        }
    }

    draw() {
        this.drawBackground();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.transitionComplete) {
            this.words.forEach(word => word.draw(this.ctx));
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.onload = () => {
    new Game();
}; 