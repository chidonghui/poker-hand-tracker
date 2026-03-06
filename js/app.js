const app = {
    data: {
        hands: [],
        currentPage: 'record',
        sortBy: 'time',
        sortOrder: 'desc',
        tempRank: null,
        currentInput: ''
    },

    init() {
        this.loadData();
        this.bindEvents();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        this.loadTodayStats();
        
        const datePicker = document.getElementById('date-picker');
        if (datePicker) {
            datePicker.value = new Date().toISOString().split('T')[0];
            datePicker.addEventListener('change', () => this.loadReviewData());
        }
        this.loadReviewData();
    },

    updateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        const el = document.getElementById('current-time');
        if (el) el.textContent = timeStr;
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
        
        const countEl = document.getElementById('today-count');
        const profitEl = document.getElementById('today-profit');
        
        if (countEl) countEl.textContent = todayHands.length;
        if (profitEl) {
            profitEl.textContent = (totalProfit >= 0 ? '+' : '') + totalProfit;
            profitEl.className = 'stat-value ' + (totalProfit >= 0 ? 'win' : 'loss');
        }
    },

    parseHand(input) {
        if (!input || !input.trim()) return { cards: [], amount: 0, handName: '' };
        
        const result = { cards: [], amount: 0, handName: '' };
        
        // 解析金额 (+1500 或 -500)
        const amountMatch = input.match(/([+-])(\d+)/);
        if (amountMatch) result.amount = parseInt(amountMatch[1] + amountMatch[2]);
        
        // 解析手牌部分
        let handPart = input.replace(/[+-]\d+/, '').trim().toUpperCase();
        const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
        
        // 检查简写格式 (如 AKs, AKo, 99)
        const shorthandMatch = handPart.match(/^([2-9TJQKA])([2-9TJQKA])([SO])$/);
        if (shorthandMatch) {
            const [, r1, r2, suited] = shorthandMatch;
            result.cards = [
                { rank: r1, suit: null },
                { rank: r2, suit: null }
            ];
            result.suited = suited === 'S';
            result.handName = r1 + r2 + suited.toLowerCase();
            return result;
        }
        
        // 解析完整手牌 (如 AsKh)
        let i = 0, count = 0;
        while (i < handPart.length && count < 2) {
            const char = handPart[i];
            const upper = char.toUpperCase();
            
            if (ranks.includes(upper)) {
                let suit = null;
                if (i + 1 < handPart.length) {
                    const next = handPart[i + 1].toLowerCase();
                    const suitMap = { s: 'S', h: 'H', d: 'D', c: 'C' };
                    if (suitMap[next]) {
                        suit = suitMap[next];
                        i += 2;
                    } else {
                        i++;
                    }
                } else {
                    i++;
                }
                
                result.cards.push({
                    rank: upper,
                    suit: suit,
                    suitName: { S: 'spade', H: 'heart', D: 'diamond', C: 'club' }[suit] || ''
                });
                count++;
            } else {
                i++;
            }
        }
        
        // 生成手牌名称
        if (result.cards.length === 2) {
            const [c1, c2] = result.cards;
            
            if (c1.rank === c2.rank) {
                // 对子
                result.handName = c1.rank + c2.rank;
            } else if (c1.suit && c2.suit) {
                // 两张都有花色
                result.handName = c1.rank + c1.suit.toLowerCase() + c2.rank + c2.suit.toLowerCase();
                result.suited = c1.suit === c2.suit;
            } else if (result.suited !== undefined) {
                // 简写带了 s/o
                result.handName = c1.rank + c2.rank + (result.suited ? 's' : 'o');
            } else {
                // 默认不同花
                result.handName = c1.rank + c2.rank;
            }
        }
        
        return result;
    },

    updateDisplay() {
        const display = document.getElementById('hand-input');
        const hint = document.querySelector('.input-hint');
        
        if (this.data.currentInput) {
            display.textContent = this.data.currentInput;
            display.classList.add('has-content');
            if (hint) hint.style.display = 'none';
        } else {
            display.textContent = '输入手牌，如: AKS+15';
            display.classList.remove('has-content');
            if (hint) hint.style.display = 'block';
        }
        
        this.updatePreview();
    },

    updatePreview() {
        const parsed = this.parseHand(this.data.currentInput);
        const preview = document.getElementById('preview-area');
        const cardsDiv = document.getElementById('preview-cards');
        const saveBtn = document.getElementById('save-btn');
        
        if (parsed.cards.length > 0) {
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
            
            if (saveBtn) saveBtn.disabled = false;
        } else {
            preview.classList.remove('show');
            if (saveBtn) saveBtn.disabled = true;
        }
    },

    saveHand() {
        const parsed = this.parseHand(this.data.currentInput);
        
        if (parsed.cards.length === 0) return;
        
        const handData = {
            id: Date.now(),
            rawInput: this.data.currentInput,
            cards: parsed.cards,
            handName: parsed.handName,
            amount: parsed.amount,
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
        
        // 显示成功提示
        this.showToast('✓ 记录成功');
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(74, 222, 128, 0.9);
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

    bindEvents() {
        const self = this;
        
        // 导航切换
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.data.currentPage = page;
                
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.page').forEach(p => {
                    p.classList.toggle('active', p.id === page + '-page');
                });
                
                if (page === 'review') this.loadReviewData();
            });
        });
        
        // 牌面按钮 - 弹出花色选择
        document.querySelectorAll('.rank-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showSuitPopup(btn.dataset.rank);
            });
        });
        
        // 花色选择
        document.querySelectorAll('.suit-popup-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.data.tempRank) {
                    this.data.currentInput += this.data.tempRank + btn.dataset.suit;
                    this.hideSuitPopup();
                    this.updateDisplay();
                }
            });
        });
        
        // 取消花色选择
        document.getElementById('suit-cancel')?.addEventListener('click', () => this.hideSuitPopup());
        document.getElementById('popup-overlay')?.addEventListener('click', () => this.hideSuitPopup());
        
        // 普通按键（花色、同花/不同花、加减号）
        document.querySelectorAll('[data-key]').forEach(key => {
            key.addEventListener('click', () => {
                const k = key.dataset.key;
                
                if (k === 'backspace') {
                    // 清除全部
                    this.data.currentInput = '';
                } else if (k === 's-suited') {
                    this.data.currentInput += 's';
                } else {
                    this.data.currentInput += k;
                }
                
                this.updateDisplay();
            });
        });
        
        // 保存按钮
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveHand());
        
        // 排序按钮
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.data.sortBy = btn.dataset.sort;
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadReviewData();
            });
        });
        
        // 排序方向
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
            totalAmountEl.className = 'summary-value ' + (totalAmount >= 0 ? 'win' : 'loss');
        }
        if (totalEvEl) totalEvEl.textContent = (totalEV >= 0 ? '+' : '') + totalEV;
        if (diffEvEl) diffEvEl.textContent = (totalAmount - totalEV >= 0 ? '+' : '') + (totalAmount - totalEV).toFixed(0);
        
        const container = document.getElementById('hand-list');
        if (!container) return;
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无记录</div>';
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
