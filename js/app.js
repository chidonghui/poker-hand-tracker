const app = {
    data: {
        hands: [],
        currentPage: 'record',
        sortBy: 'time',
        sortOrder: 'desc',
        tempRank: null
    },

    init() {
        this.loadData();
        this.bindEvents();
        this.loadTodayStats();
        document.getElementById('date-picker').value = new Date().toISOString().split('T')[0];
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
        
        let gameTime = '0h0m';
        if (todayHands.length > 0) {
            const times = todayHands.map(h => h.timestamp);
            const diff = Math.max(...times) - Math.min(...times);
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            gameTime = `${h}h${m}m`;
        }
        
        document.getElementById('today-count').textContent = todayHands.length;
        document.getElementById('today-time').textContent = gameTime;
        
        const el = document.getElementById('today-profit');
        el.textContent = (totalProfit >= 0 ? '+' : '') + totalProfit;
        el.style.color = totalProfit >= 0 ? '#4caf50' : '#f44336';
    },

    parseHand(input) {
        if (!input.trim()) return { cards: [], amount: 0, handName: '' };
        
        const result = { cards: [], amount: 0, handName: '' };
        
        const amountMatch = input.match(/([+-])\s*(\d+)/);
        if (amountMatch) result.amount = parseInt(amountMatch[1] + amountMatch[2]);
        
        let handPart = input.replace(/[+-]\s*\d+/, '').trim().toUpperCase();
        const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
        
        const suitedMatch = handPart.match(/^([2-9TJQKA])([2-9TJQKA])([SO])$/);
        if (suitedMatch) {
            const [, r1, r2, m] = suitedMatch;
            result.cards = [{rank: r1}, {rank: r2}];
            result.suited = m === 'S';
            result.handName = r1 + r2 + m.toLowerCase();
            return result;
        }
        
        let original = input.replace(/[+-]\s*\d+/, '').trim();
        let i = 0, count = 0;
        
        while (i < original.length && count < 2) {
            const char = original[i];
            const upper = char.toUpperCase();
            
            if (ranks.includes(upper)) {
                let suit = null;
                if (i + 1 < original.length) {
                    const next = original[i + 1].toLowerCase();
                    const map = {s:'S', h:'H', d:'D', c:'C'};
                    if (map[next]) {
                        suit = map[next];
                        i += 2;
                    } else i++;
                } else i++;
                
                result.cards.push({
                    rank: upper,
                    suit,
                    suitName: {S:'spade', H:'heart', D:'diamond', C:'club'}[suit] || ''
                });
                count++;
            } else i++;
        }
        
        if (result.cards.length === 2) {
            const [c1, c2] = result.cards;
            if (c1.suit && c2.suit) result.suited = c1.suit === c2.suit;
            
            if (c1.rank === c2.rank) result.handName = c1.rank + c2.rank;
            else if (c1.suit && c2.suit) result.handName = c1.rank + c1.suit.toLowerCase() + c2.rank + c2.suit.toLowerCase();
            else if (result.suited) result.handName = c1.rank + c2.rank + 's';
            else result.handName = c1.rank + c2.rank;
        }
        
        return result;
    },

    updatePreview() {
        const input = document.getElementById('hand-input').value;
        const parsed = this.parseHand(input);
        const preview = document.getElementById('preview-area');
        const cardsDiv = document.getElementById('preview-cards');
        
        if (parsed.cards.length > 0) {
            preview.classList.add('show');
            
            cardsDiv.innerHTML = parsed.cards.map(card => {
                const isRed = card.suit === 'H' || card.suit === 'D';
                const suit = {S:'♠', H:'♥', D:'♦', C:'♣'}[card.suit] || '';
                return `<div class="poker-card ${isRed ? 'red' : ''}">
                    <div>${card.rank}</div>
                    <div style="font-size:20px;">${suit}</div>
                </div>`;
            }).join('');
            
            document.getElementById('save-btn').disabled = false;
        } else {
            preview.classList.remove('show');
            document.getElementById('save-btn').disabled = true;
        }
    },

    saveHand() {
        const input = document.getElementById('hand-input').value;
        const parsed = this.parseHand(input);
        
        if (parsed.cards.length === 0) return;
        
        const handData = {
            id: Date.now(),
            rawInput: input,
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
        
        document.getElementById('hand-input').value = '';
        this.updatePreview();
        this.loadTodayStats();
        
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:#4caf50;padding:20px 40px;border-radius:10px;z-index:300;font-size:18px;';
        toast.textContent = '✓ 记录成功';
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
        const handInput = document.getElementById('hand-input');
        
        // 导航
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
        
        // 输入框禁用原生输入法
        handInput.addEventListener('focus', (e) => {
            e.preventDefault();
            handInput.blur();
        });
        
        // 牌面选择 - 弹出花色
        document.querySelectorAll('.rank-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showSuitPopup(btn.dataset.rank));
        });
        
        // 花色选择
        document.querySelectorAll('.suit-popup-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.data.tempRank) {
                    handInput.value += this.data.tempRank + btn.dataset.suit;
                    this.hideSuitPopup();
                    this.updatePreview();
                }
            });
        });
        
        // 取消花色选择
        document.getElementById('suit-cancel').addEventListener('click', () => this.hideSuitPopup());
        document.getElementById('popup-overlay').addEventListener('click', () => this.hideSuitPopup());
        
        // 普通按键
        document.querySelectorAll('[data-key]').forEach(key => {
            key.addEventListener('click', () => {
                const k = key.dataset.key;
                if (k === 'clear') handInput.value = '';
                else if (k === 's-suited') handInput.value += 's';
                else handInput.value += k;
                this.updatePreview();
            });
        });
        
        // 保存
        document.getElementById('save-btn').addEventListener('click', () => this.saveHand());
        
        // 日期
        document.getElementById('date-picker').addEventListener('change', () => this.loadReviewData());
        
        // 排序
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.data.sortBy = btn.dataset.sort;
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadReviewData();
            });
        });
        
        document.getElementById('order-btn').addEventListener('click', () => {
            this.data.sortOrder = this.data.sortOrder === 'desc' ? 'asc' : 'desc';
            document.getElementById('order-btn').textContent = this.data.sortOrder === 'desc' ? '↓' : '↑';
            this.loadReviewData();
        });
    },

    loadReviewData() {
        const date = document.getElementById('date-picker').value;
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
        
        document.getElementById('total-hands').textContent = filtered.length;
        document.getElementById('total-amount').textContent = (totalAmount >= 0 ? '+' : '') + totalAmount;
        document.getElementById('total-amount').className = 'summary-value ' + (totalAmount >= 0 ? 'win' : 'loss');
        document.getElementById('total-ev').textContent = (totalEV >= 0 ? '+' : '') + totalEV;
        document.getElementById('diff-ev').textContent = (totalAmount - totalEV >= 0 ? '+' : '') + (totalAmount - totalEV).toFixed(0);
        
        const container = document.getElementById('hand-list');
        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">暂无记录</div>';
            return;
        }
        
        container.innerHTML = filtered.map(h => {
            const time = new Date(h.timestamp).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
            return `
                <div class="hand-item" data-id="${h.id}">
                    <div class="hand-cards">
                        ${h.cards.map(c => {
                            const isRed = c.suit === 'H' || c.suit === 'D';
                            const suit = {S:'♠',H:'♥',D:'♦',C:'♣'}[c.suit] || '';
                            return `<span class="${isRed ? 'red' : ''}">${c.rank}${suit}</span>`;
                        }).join(' ')}
                    </div>
                    <div class="hand-info">
                        <span>${time}</span>
                        <span class="hand-profit ${h.amount >= 0 ? 'win' : 'loss'}">${h.amount >= 0 ? '+' : ''}${h.amount}</span>
                    </div>
                </div>`;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
