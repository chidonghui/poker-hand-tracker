const app = {
    data: {
        hands: [],
        currentPage: 'record',
        currentInput: '',
        tempRank: null,
        isAmountMode: false
    },

    init() {
        this.loadData();
        this.bindEvents();
        this.loadTodayStats();
        this.loadReviewData();
    },

    loadData() {
        const saved = localStorage.getItem('pokerHands');
        if (saved) this.data.hands = JSON.parse(saved);
    },

    saveData() {
        localStorage.setItem('pokerHands', JSON.stringify(this.data.hands));
    },

    loadTodayStats() {
        const today = new Date().toDateString();
        const todayHands = this.data.hands.filter(h =>
            new Date(h.timestamp).toDateString() === today
        );

        const totalProfit = todayHands.reduce((sum, h) => sum + h.amount, 0);

        let gameTimeStr = '0h0m';
        if (todayHands.length > 0) {
            const times = todayHands.map(h => h.timestamp);
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            const diffMs = maxTime - minTime;
            const hours = Math.floor(diffMs / 3600000);
            const minutes = Math.floor((diffMs % 3600000) / 60000);
            gameTimeStr = `${hours}h${minutes}m`;
        }

        const countEl = document.getElementById('today-count');
        const profitEl = document.getElementById('today-profit');
        const timeEl = document.getElementById('today-time');

        if (countEl) countEl.textContent = todayHands.length;
        if (profitEl) {
            profitEl.textContent = (totalProfit >= 0 ? '+' : '') + totalProfit;
            profitEl.className = 'stat-num ' + (totalProfit >= 0 ? 'win' : 'loss');
        }
        if (timeEl) timeEl.textContent = gameTimeStr;
    },

    parseInputState() {
        const input = this.data.currentInput;
        const hasSymbol = /[+-]/.test(input);
        const cardMatches = input.match(/[AKQJT2-9][shdc]?/gi) || [];
        const cardCount = cardMatches.length;
        return { hasSymbol, cardCount };
    },

    updateDisplay() {
        const display = document.getElementById('hand-input');
        let displayText = this.data.currentInput;

        if (/[+-]/.test(displayText)) {
            const match = displayText.match(/([+-])([AKQJT0-9]+)$/);
            if (match) {
                let num = 0;
                for (const char of match[2]) {
                    if (char === 'A') num = num * 10 + 1;
                    else if (char === 'T') num = num * 10 + 10;
                    else if (/[2-9]/.test(char)) num = num * 10 + parseInt(char);
                    else if (char === '0') num = num * 10 + 0;
                }
                displayText = displayText.replace(match[0], match[1] + num);
            }
        }

        if (this.data.currentInput) {
            display.textContent = displayText;
            display.classList.add('has-content');
        } else {
            display.textContent = '输入手牌，如: 67s+15';
            display.classList.remove('has-content');
        }

        this.updatePreview();
    },

    updatePreview() {
        const preview = document.getElementById('preview-area');
        const cardsDiv = document.getElementById('preview-cards');
        const saveBtn = document.getElementById('save-btn');

        const cards = [];
        const matches = this.data.currentInput.match(/[AKQJT2-9][shdc]?/gi) || [];

        for (const match of matches.slice(0, 2)) {
            const rank = match[0].toUpperCase();
            const suit = match[1] ? match[1].toUpperCase() : null;
            cards.push({ rank, suit });
        }

        if (cards.length > 0) {
            preview.classList.add('show');
            cardsDiv.innerHTML = cards.map(card => {
                const isRed = card.suit === 'H' || card.suit === 'D';
                const suitSymbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit] || '';
                return `
                    <div class="poker-card ${isRed ? 'red' : ''}">
                        <div>${card.rank}</div>
                        <div class="suit">${suitSymbol}</div>
                    </div>
                `;
            }).join('');
            if (saveBtn) saveBtn.disabled = cards.length < 2;
        } else {
            preview.classList.remove('show');
            if (saveBtn) saveBtn.disabled = true;
        }
    },

    showSuitPopup(rank) {
        this.data.tempRank = rank;
        document.getElementById('suit-popup').style.display = 'block';
        document.getElementById('popup-overlay').style.display = 'block';
    },

    hideSuitPopup() {
        this.data.tempRank = null;
        document.getElementById('suit-popup').style.display = 'none';
        document.getElementById('popup-overlay').style.display = 'none';
    },

    saveHand() {
        const cards = [];
        const matches = this.data.currentInput.match(/[AKQJT2-9][shdc]?/gi) || [];

        for (const match of matches.slice(0, 2)) {
            const rank = match[0].toUpperCase();
            const suit = match[1] ? match[1].toUpperCase() : null;
            cards.push({ rank, suit });
        }

        if (cards.length < 2) {
            this.showToast('请输入两张手牌');
            return;
        }

        let amount = 0;
        const amountMatch = this.data.currentInput.match(/([+-])([AKQJT0-9]+)$/);
        if (amountMatch) {
            for (const char of amountMatch[2]) {
                if (char === 'A') amount = amount * 10 + 1;
                else if (char === 'T') amount = amount * 10 + 10;
                else if (/[2-9]/.test(char)) amount = amount * 10 + parseInt(char);
                else if (char === '0') amount = amount * 10 + 0;
            }
            if (amountMatch[1] === '-') amount = -amount;
        }

        const [c1, c2] = cards;
        let handName = '';
        if (c1.rank === c2.rank) handName = c1.rank + c2.rank;
        else if (c1.suit && c2.suit && c1.suit === c2.suit) handName = c1.rank + c2.rank + 's';
        else handName = c1.rank + c2.rank + 'o';

        const handData = {
            id: Date.now(),
            rawInput: this.data.currentInput,
            cards: cards,
            handName: handName,
            amount: amount,
            ev: null,
            position: '',
            action: '',
            timestamp: Date.now(),
            reviewed: false
        };

        this.data.hands.unshift(handData);
        this.saveData();

        this.data.currentInput = '';
        this.updateDisplay();
        this.loadTodayStats();
        this.showToast('✓ 记录成功');
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(74, 222, 128, 0.95);
            color: #000;
            padding: 16px 32px;
            border-radius: 12px;
            z-index: 300;
            font-size: 16px;
            font-weight: 600;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
    },

    // 复盘页面功能
    loadReviewData() {
        const today = new Date().toISOString().split('T')[0];
        const filtered = this.data.hands.filter(h =>
            new Date(h.timestamp).toISOString().split('T')[0] === today
        );

        filtered.sort((a, b) => a.timestamp - b.timestamp);

        const totalHands = filtered.length;
        const totalAmount = filtered.reduce((s, h) => s + h.amount, 0);
        const totalEV = filtered.reduce((s, h) => s + (h.ev || 0), 0);
        const bbPer100 = totalHands > 0 ? ((totalAmount / 10) / totalHands * 100).toFixed(1) : 0;

        const handsEl = document.getElementById('review-hands');
        const netEl = document.getElementById('review-net');
        const evEl = document.getElementById('review-ev');
        const bbEl = document.getElementById('review-bb');

        if (handsEl) handsEl.textContent = totalHands;
        if (netEl) {
            netEl.textContent = (totalAmount >= 0 ? '+' : '') + totalAmount;
            netEl.className = 'main-stat-value ' + (totalAmount >= 0 ? 'win' : 'loss');
        }
        if (evEl) {
            evEl.textContent = (totalEV >= 0 ? '+' : '') + totalEV;
            evEl.className = 'main-stat-value ' + (totalEV >= 0 ? 'win' : 'loss');
        }
        if (bbEl) bbEl.textContent = bbPer100;

        this.drawChart(filtered);
        this.renderHandList(filtered);
    },

    drawChart(hands) {
        const canvas = document.getElementById('profit-chart');
        if (!canvas || hands.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth || 400;
        const height = canvas.height = 120;

        ctx.clearRect(0, 0, width, height);

        let cumulative = 0;
        const data = hands.map(h => {
            cumulative += h.amount;
            return cumulative;
        });

        if (data.length === 0) return;

        const min = Math.min(...data, 0);
        const max = Math.max(...data, 0);
        const range = max - min || 1;

        // 网格线
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = height - (i / 4) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 零线
        const zeroY = height - ((0 - min) / range) * height;
        ctx.strokeStyle = '#4a4a5e';
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(width, zeroY);
        ctx.stroke();

        // 折线
        const color = data[data.length - 1] >= 0 ? '#4ade80' : '#f87171';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((val, i) => {
            const x = (i / (data.length - 1 || 1)) * width;
            const y = height - ((val - min) / range) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 渐变填充
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color === '#4ade80' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fill();
    },

    renderHandList(hands) {
        const container = document.getElementById('hand-list');
        if (!container) return;

        if (hands.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#6b6b7b;">暂无记录</div>';
            return;
        }

        const reversed = [...hands].reverse();

        container.innerHTML = reversed.map(h => {
            const time = new Date(h.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const cardsHtml = h.cards.map(c => {
                const isRed = c.suit === 'H' || c.suit === 'D';
                const suitSymbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[c.suit] || '';
                return `
                    <div class="mini-card ${isRed ? 'red' : ''}">
                        <div>${c.rank}</div>
                        <div class="suit">${suitSymbol}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="hand-row" data-id="${h.id}">
                    <div class="hand-cards-small">${cardsHtml}</div>
                    <div class="hand-detail">
                        <div class="hand-type">${h.handName}</div>
                        <div class="hand-time">${time}</div>
                    </div>
                    <div class="hand-amount ${h.amount >= 0 ? 'win' : 'loss'}">
                        ${h.amount >= 0 ? '+' : ''}${h.amount}
                    </div>
                    <button class="btn-edit" onclick="app.openEditor(${h.id})">编辑</button>
                </div>
            `;
        }).join('');
    },

    // 编辑功能
    editingHandId: null,

    openEditor(handId) {
        const hand = this.data.hands.find(h => h.id === handId);
        if (!hand) return;

        this.editingHandId = handId;

        // 填充手牌信息
        const cardsContainer = document.getElementById('editor-cards');
        cardsContainer.innerHTML = hand.cards.map(c => {
            const isRed = c.suit === 'H' || c.suit === 'D';
            const suitSymbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[c.suit] || '';
            return `
                <div class="editor-card ${isRed ? 'red' : ''}">
                    <div>${c.rank}</div>
                    <div class="suit">${suitSymbol}</div>
                </div>
            `;
        }).join('');

        document.getElementById('editor-amount').textContent = (hand.amount >= 0 ? '+' : '') + hand.amount;
        document.getElementById('editor-amount').className = 'editor-amount ' + (hand.amount >= 0 ? 'win' : 'loss');

        // 填充已有数据
        if (hand.position) {
            document.querySelectorAll('.pos-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.pos === hand.position);
            });
        }
        if (hand.preflop) document.getElementById('preflop-action').value = hand.preflop;
        if (hand.flopCards) {
            document.getElementById('flop-1').value = hand.flopCards[0] || '';
            document.getElementById('flop-2').value = hand.flopCards[1] || '';
            document.getElementById('flop-3').value = hand.flopCards[2] || '';
        }
        if (hand.flop) document.getElementById('flop-action').value = hand.flop;
        if (hand.turnCard) document.getElementById('turn-card').value = hand.turnCard;
        if (hand.turn) document.getElementById('turn-action').value = hand.turn;
        if (hand.riverCard) document.getElementById('river-card').value = hand.riverCard;
        if (hand.river) document.getElementById('river-action').value = hand.river;
        if (hand.note) document.getElementById('hand-note').value = hand.note;

        // 显示编辑器
        document.getElementById('hand-editor').style.display = 'flex';
    },

    closeEditor() {
        document.getElementById('hand-editor').style.display = 'none';
        this.editingHandId = null;

        // 清空表单
        document.querySelectorAll('.pos-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('preflop-action').value = '';
        document.getElementById('flop-1').value = '';
        document.getElementById('flop-2').value = '';
        document.getElementById('flop-3').value = '';
        document.getElementById('flop-action').value = '';
        document.getElementById('turn-card').value = '';
        document.getElementById('turn-action').value = '';
        document.getElementById('river-card').value = '';
        document.getElementById('river-action').value = '';
        document.getElementById('hand-note').value = '';
    },

    saveEditor() {
        if (!this.editingHandId) return;

        const hand = this.data.hands.find(h => h.id === this.editingHandId);
        if (!hand) return;

        // 保存位置
        const activePos = document.querySelector('.pos-btn.active');
        if (activePos) hand.position = activePos.dataset.pos;

        // 保存各阶段数据
        hand.preflop = document.getElementById('preflop-action').value;
        hand.flopCards = [
            document.getElementById('flop-1').value.toUpperCase(),
            document.getElementById('flop-2').value.toUpperCase(),
            document.getElementById('flop-3').value.toUpperCase()
        ].filter(c => c);
        hand.flop = document.getElementById('flop-action').value;
        hand.turnCard = document.getElementById('turn-card').value.toUpperCase();
        hand.turn = document.getElementById('turn-action').value;
        hand.riverCard = document.getElementById('river-card').value.toUpperCase();
        hand.river = document.getElementById('river-action').value;
        hand.note = document.getElementById('hand-note').value;
        hand.reviewed = true;

        this.saveData();
        this.closeEditor();
        this.showToast('✓ 保存成功');
    },

    bindEvents() {
        // 导航切换
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.data.currentPage = page;

                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.page').forEach(p => {
                    p.classList.toggle('active', p.id === page + '-page');
                });

                if (page === 'review') this.loadReviewData();
            });
        });

        // 牌面按钮
        document.querySelectorAll('.k.rank').forEach(btn => {
            btn.addEventListener('click', () => {
                const state = this.parseInputState();
                if (!state.hasSymbol && state.cardCount < 2) {
                    this.showSuitPopup(btn.dataset.key);
                }
            });
        });

        // 花色选择
        document.querySelectorAll('.suit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.data.tempRank) {
                    this.data.currentInput += this.data.tempRank + btn.dataset.suit;
                    this.data.tempRank = null;
                    this.hideSuitPopup();
                    this.updateDisplay();
                }
            });
        });

        document.getElementById('suit-cancel')?.addEventListener('click', () => this.hideSuitPopup());
        document.getElementById('popup-overlay')?.addEventListener('click', () => this.hideSuitPopup());

        // 普通按键
        document.querySelectorAll('.k[data-key]').forEach(key => {
            key.addEventListener('click', () => {
                const k = key.dataset.key;
                const state = this.parseInputState();

                if (k === 'backspace') {
                    this.data.currentInput = this.data.currentInput.slice(0, -1);
                } else if (k === '+' || k === '-') {
                    if (state.cardCount >= 2) {
                        this.data.currentInput = this.data.currentInput.replace(/[+-].*$/, '') + k;
                    }
                } else if (k === 's' || k === 'o') {
                    if (!state.hasSymbol && state.cardCount >= 2) {
                        if (!/[so]$/i.test(this.data.currentInput)) {
                            this.data.currentInput += k;
                        }
                    }
                } else {
                    if (state.hasSymbol) {
                        this.data.currentInput += k;
                    }
                }

                this.updateDisplay();
            });
        });

        // 保存按钮
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveHand());

        // 筛选标签
        document.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 编辑器事件
        document.getElementById('editor-close')?.addEventListener('click', () => this.closeEditor());
        document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.closeEditor());
        document.getElementById('btn-save-edit')?.addEventListener('click', () => this.saveEditor());

        // 位置按钮
        document.querySelectorAll('.pos-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 初始化 iframe 卡片选择器（方案A）
        this.initIframePicker();
    },

    // 方案 A: iframe 卡片选择器
    initIframePicker() {
        this.currentCardInput = null;
        const wrapper = document.getElementById('iframe-picker-wrapper');
        const overlay = document.getElementById('popup-overlay');
        const iframe = document.getElementById('card-picker-iframe');

        if (!wrapper || !overlay || !iframe) return;

        // 监听 iframe 消息
        window.addEventListener('message', (e) => {
            if (e.data.type === 'cardSelected') {
                if (this.currentCardInput) {
                    this.currentCardInput.value = e.data.value;
                    this.hideIframePicker();
                    
                    // 自动聚焦到下一个输入框
                    const inputs = document.querySelectorAll('.card-input');
                    const currentIndex = Array.from(inputs).indexOf(this.currentCardInput);
                    if (currentIndex < inputs.length - 1) {
                        inputs[currentIndex + 1].focus();
                    }
                }
            } else if (e.data.type === 'closePicker') {
                this.hideIframePicker();
            }
        });

        // 绑定 card-input 点击事件
        document.querySelectorAll('.card-input').forEach(input => {
            input.addEventListener('click', () => {
                this.currentCardInput = input;
                wrapper.style.display = 'block';
                overlay.style.display = 'block';
                
                // 发送当前值给 iframe
                iframe.onload = () => {
                    iframe.contentWindow.postMessage({
                        type: 'setValue',
                        value: input.value
                    }, '*');
                };
                // 如果 iframe 已加载，直接发送
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'setValue',
                        value: input.value
                    }, '*');
                }
            });
        });

        // 点击遮罩关闭
        overlay.addEventListener('click', () => this.hideIframePicker());
    },

    hideIframePicker() {
        const wrapper = document.getElementById('iframe-picker-wrapper');
        const overlay = document.getElementById('popup-overlay');
        if (wrapper) wrapper.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        this.currentCardInput = null;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
