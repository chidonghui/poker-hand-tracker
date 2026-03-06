const app = {
    data: {
        hands: [],
        currentPage: 'record',
        sortBy: 'time',
        sortOrder: 'desc',
        currentInput: '',
        tempRank: null,
        isAmountMode: false  // false=输入牌, true=输入金额
    },

    init() {
        this.loadData();
        this.bindEvents();
        this.loadTodayStats();
        
        const datePicker = document.getElementById('date-picker');
        if (datePicker) {
            datePicker.value = new Date().toISOString().split('T')[0];
            datePicker.addEventListener('change', () => this.loadReviewData());
        }
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

    // 解析当前输入状态
    parseInputState() {
        const input = this.data.currentInput;
        
        // 检查是否有 +- 号
        const hasSymbol = /[+-]/.test(input);
        this.data.isAmountMode = hasSymbol;
        
        // 解析手牌数量
        const cardMatches = input.match(/[AKQJT2-9][shdc]?/gi) || [];
        const cardCount = cardMatches.length;
        
        return { hasSymbol, cardCount };
    },

    updateDisplay() {
        const display = document.getElementById('hand-input');
        const state = this.parseInputState();
        
        // 转换显示金额（A=1, T=10）
        let displayText = this.data.currentInput;
        
        if (state.hasSymbol) {
            // 提取符号后的数字部分
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
        const state = this.parseInputState();
        const preview = document.getElementById('preview-area');
        const cardsDiv = document.getElementById('preview-cards');
        const saveBtn = document.getElementById('save-btn');
        
        // 解析手牌用于预览
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
        const state = this.parseInputState();
        
        // 解析手牌
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
        
        // 解析金额
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
        
        // 生成手牌名
        const [c1, c2] = cards;
        let handName = '';
        if (c1.rank === c2.rank) {
            handName = c1.rank + c2.rank;
        } else if (c1.suit && c2.suit && c1.suit === c2.suit) {
            handName = c1.rank + c2.rank + 's';
        } else {
            handName = c1.rank + c2.rank + 'o';
        }
        
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
        this.data.isAmountMode = false;
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
        
        // 牌面按钮 - 弹花色选择（只在非金额模式）
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
        
        // 其他按键
        document.querySelectorAll('.k[data-key]').forEach(key => {
            key.addEventListener('click', () => {
                const k = key.dataset.key;
                const state = this.parseInputState();
                
                if (k === 'backspace') {
                    // 退格：如果删掉+-，退出金额模式
                    this.data.currentInput = this.data.currentInput.slice(0, -1);
                } else if (k === '+' || k === '-') {
                    // 必须有2张牌才能输入金额
                    if (state.cardCount >= 2) {
                        // 移除之前的符号
                        this.data.currentInput = this.data.currentInput.replace(/[+-].*$/, '') + k;
                    }
                } else if (k === 's' || k === 'o') {
                    // s/o 简写，只在输入牌阶段
                    if (!state.hasSymbol && state.cardCount >= 2) {
                        if (!/[so]$/i.test(this.data.currentInput)) {
                            this.data.currentInput += k;
                        }
                    }
                } else if (/[AKQJT2-9]/.test(k)) {
                    // A-T 或数字
                    if (state.hasSymbol) {
                        // 金额模式：A=1, T=10
                        this.data.currentInput += k;
                    } else if (state.cardCount < 2) {
                        // 牌模式且少于2张：需要弹花色（上面已处理rank按钮）
                        // 这里处理的是再次点击（不应该执行到这里）
                    }
                } else if (k === '0' || k === '00' || k === '000') {
                    // 纯数字，只在金额模式
                    if (state.hasSymbol) {
                        this.data.currentInput += k.replace(/0/g, '0');
                    }
                }
                
                this.updateDisplay();
            });
        });
        
        // 保存按钮
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveHand());
        
        // 日期选择
        document.getElementById('date-picker')?.addEventListener('change', () => this.loadReviewData());
        
        // 排序
        document.querySelectorAll('.sort-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                this.data.sortBy = btn.dataset.sort;
                document.querySelectorAll('.sort-tag').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadReviewData();
            });
        });
        
        document.getElementById('order-btn')?.addEventListener('click', () => {
            this.data.sortOrder = this.data.sortOrder === 'desc' ? 'asc' : 'desc';
            document.getElementById('order-btn').textContent = this.data.sortOrder === 'desc' ? '↓' : '↑';
            this.loadReviewData();
        });
    },

    loadReviewData() {
        const datePicker = document.getElementById('date-picker');
        if (!datePicker) return;
        
        const date = datePicker.value;
        const filtered = this.data.hands.filter(h => 
            new Date(h.timestamp).toISOString().split('T')[0] === date
        );
        
        filtered.sort((a, b) => {
            let va, vb;
            switch (this.data.sortBy) {
                case 'amount': va = a.amount; vb = b.amount; break;
                case 'ev': va = a.ev || 0; vb = b.ev || 0; break;
                default: va = a.timestamp; vb = b.timestamp;
            }
            return this.data.sortOrder === 'desc' ? vb - va : va - vb;
        });
        
        const totalAmount = filtered.reduce((s, h) => s + h.amount, 0);
        const totalEV = filtered.reduce((s, h) => s + (h.ev || 0), 0);
        
        const totalHandsEl = document.getElementById('total-hands');
        const totalAmountEl = document.getElementById('total-amount');
        const totalEvEl = document.getElementById('total-ev');
        const diffEvEl = document.getElementById('diff-ev');
        
        if (totalHandsEl) totalHandsEl.textContent = filtered.length;
        if (totalAmountEl) {
            totalAmountEl.textContent = (totalAmount >= 0 ? '+' : '') + totalAmount;
            totalAmountEl.className = 'data-val ' + (totalAmount >= 0 ? 'win' : 'loss');
        }
        if (totalEvEl) totalEvEl.textContent = (totalEV >= 0 ? '+' : '') + totalEV;
        if (diffEvEl) diffEvEl.textContent = (totalAmount - totalEV >= 0 ? '+' : '') + (totalAmount - totalEV).toFixed(0);
        
        const container = document.getElementById('hand-list');
        if (!container) return;
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-box">暂无记录</div>';
            return;
        }
        
        container.innerHTML = filtered.map(h => {
            const time = new Date(h.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const cardsHtml = h.cards.map(c => {
                const isRed = c.suit === 'H' || c.suit === 'D';
                const suit = { S: '♠', H: '♥', D: '♦', C: '♣' }[c.suit] || '';
                return `<span class="${isRed ? 'red' : ''}">${c.rank}${suit}</span>`;
            }).join(' ');
            
            return `
                <div class="hand-item" data-id="${h.id}">
                    <div class="hand-cards">${cardsHtml}</div>
                    <div class="hand-info">
                        <span>${time}</span>
                        <span class="hand-profit ${h.amount >= 0 ? 'win' : 'loss'}">
                            ${h.amount >= 0 ? '+' : ''}${h.amount}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
