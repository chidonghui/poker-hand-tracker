const app = {
    data: {
        hands: [],
        currentPage: 'record',
        sortBy: 'time',
        sortOrder: 'desc',
        currentInput: '',
        inputPhase: 'cards' // 'cards' | 'amount'
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

    // 解析输入，判断当前阶段
    parseInput(input) {
        if (!input) return { phase: 'cards', cards: [], amount: 0 };
        
        // 检查是否有 +- 号，有的话后面是数字
        const amountMatch = input.match(/([+-])([AKQJT0-9]+)$/);
        if (amountMatch) {
            const symbol = amountMatch[1];
            const numStr = amountMatch[2];
            // 转换数字：A=1, T=10, 其他直接转数字
            let amount = 0;
            for (const char of numStr) {
                if (char === 'A') amount = amount * 10 + 1;
                else if (char === 'T') amount = amount * 10 + 10;
                else if (/[0-9]/.test(char)) amount = amount * 10 + parseInt(char);
            }
            return { 
                phase: 'amount', 
                symbol,
                amount: symbol === '+' ? amount : -amount,
                numStr
            };
        }
        
        // 解析手牌
        const cards = [];
        let i = 0;
        const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
        
        while (i < input.length && cards.length < 2) {
            const char = input[i].toUpperCase();
            if (ranks.includes(char)) {
                let suit = null;
                // 检查下一位是否是花色
                if (i + 1 < input.length) {
                    const next = input[i + 1].toLowerCase();
                    if (['s','h','d','c'].includes(next)) {
                        suit = next.toUpperCase();
                        i += 2;
                    } else {
                        i++;
                    }
                } else {
                    i++;
                }
                cards.push({ rank: char, suit });
            } else if (['S','O'].includes(char) && cards.length === 2) {
                // s/o 标记（简写同花/不同花）
                i++;
            } else {
                i++;
            }
        }
        
        // 如果有 s/o 在末尾，处理简写
        const suitedMatch = input.match(/([AKQJT2-9])([AKQJT2-9])([SO])$/i);
        if (suitedMatch && cards.length === 2) {
            // 简写格式，不需要单独处理，解析时已包含
        }
        
        return { phase: cards.length >= 2 ? 'amount' : 'cards', cards };
    },

    // 获取当前输入阶段
    getInputPhase() {
        const parsed = this.parseInput(this.data.currentInput);
        return parsed.phase;
    },

    updateDisplay() {
        const display = document.getElementById('hand-input');
        const phase = this.getInputPhase();
        
        // 显示转换后的输入（把 A/T 数字转换回来显示）
        let displayText = this.data.currentInput;
        const amountMatch = displayText.match(/([+-])([AKQJT0-9]+)$/);
        if (amountMatch) {
            const symbol = amountMatch[1];
            const numStr = amountMatch[2];
            let amount = 0;
            for (const char of numStr) {
                if (char === 'A') amount = amount * 10 + 1;
                else if (char === 'T') amount = amount * 10 + 10;
                else if (/[0-9]/.test(char)) amount = amount * 10 + parseInt(char);
            }
            displayText = displayText.replace(amountMatch[0], symbol + amount);
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
        const parsed = this.parseInput(this.data.currentInput);
        const preview = document.getElementById('preview-area');
        const cardsDiv = document.getElementById('preview-cards');
        const saveBtn = document.getElementById('save-btn');
        
        if (parsed.cards && parsed.cards.length > 0) {
            preview.classList.add('show');
            
            cardsDiv.innerHTML = parsed.cards.map(card => {
                const isRed = card.suit === 'H' || card.suit === 'D';
                const suitSymbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit] || '';
                return `
                    <div class="poker-card ${isRed ? 'red' : ''}">
                        <div>${card.rank}</div>
                        <div class="suit">${suitSymbol}</div>
                    </div>
                `;
            }).join('');
            
            if (saveBtn) saveBtn.disabled = parsed.cards.length < 2;
        } else {
            preview.classList.remove('show');
            if (saveBtn) saveBtn.disabled = true;
        }
    },

    saveHand() {
        const parsed = this.parseInput(this.data.currentInput);
        
        if (!parsed.cards || parsed.cards.length < 2) {
            this.showToast('请输入完整手牌');
            return;
        }
        
        const [c1, c2] = parsed.cards;
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
            cards: parsed.cards,
            handName: handName,
            amount: parsed.amount || 0,
            ev: null,
            position: '',
            action: '',
            timestamp: Date.now(),
            reviewed: false
        };
        
        this.data.hands.unshift(handData);
        this.saveData();
        
        // 清空输入
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
        
        // 键盘输入
        document.querySelectorAll('.k[data-key]').forEach(key => {
            key.addEventListener('click', () => {
                const k = key.dataset.key;
                const phase = this.getInputPhase();
                
                if (k === 'backspace') {
                    this.data.currentInput = this.data.currentInput.slice(0, -1);
                } else if (k === '+' || k === '-') {
                    // 必须有两张牌才能输入金额
                    const parsed = this.parseInput(this.data.currentInput);
                    if (parsed.cards && parsed.cards.length >= 2) {
                        // 去掉之前的符号，用新的
                        this.data.currentInput = this.data.currentInput.replace(/[+-].*$/, '') + k;
                    }
                } else if (['s','o'].includes(k)) {
                    // s/o 只能在输入牌阶段使用，且只能在两张牌之后
                    if (phase === 'cards') {
                        // 检查是否已经输入了 s/o
                        if (!/[so]$/i.test(this.data.currentInput)) {
                            this.data.currentInput += k;
                        }
                    }
                } else {
                    // A-T 或数字
                    if (phase === 'cards') {
                        // 牌阶段：A-T 是牌面
                        if (/[AKQJT2-9]/.test(k)) {
                            // 检查当前输入了多少张牌
                            const parsed = this.parseInput(this.data.currentInput);
                            if (parsed.cards.length < 2) {
                                this.data.currentInput += k;
                            }
                            // 如果已经有两张牌，不允许再输入牌面
                        }
                    } else {
                        // 金额阶段：A=1, T=10
                        if (/[AKQJT0]/.test(k) || k === '00' || k === '000') {
                            // 检查是否已经有符号
                            if (/[+-]/.test(this.data.currentInput)) {
                                this.data.currentInput += k;
                            }
                        }
                    }
                }
                
                this.updateDisplay();
            });
        });
        
        // 保存按钮
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveHand());
        
        // 日期选择
        document.getElementById('date-picker')?.addEventListener('change', () => this.loadReviewData());
        
        // 排序按钮
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
