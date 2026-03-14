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
        
        // 获取已选的牌（用于防重复选择）
        const currentInput = this.data.currentInput;
        const matches = currentInput.match(/[AKQJT2-9][shdc]?/gi) || [];
        const selectedCards = matches.map(m => m.toUpperCase());
        
        // 更新花色弹窗按钮状态
        const suitBtns = document.querySelectorAll('.suit-btn');
        suitBtns.forEach(btn => {
            const suit = btn.dataset.suit.toUpperCase();
            const cardCombo = rank + suit;
            // 如果这张牌已经选过，禁用按钮
            if (selectedCards.includes(cardCombo)) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
        
        document.getElementById('suit-popup').style.display = 'block';
        document.getElementById('popup-overlay').style.display = 'block';
    },

    hideSuitPopup() {
        this.data.tempRank = null;
        document.getElementById('suit-popup').style.display = 'none';
        document.getElementById('popup-overlay').style.display = 'none';
    },

    // 手牌输入格式校验
    validateHandInput(input) {
        const result = { valid: false, message: '' };
        
        // 1. 检查是否有输入
        if (!input || input.trim() === '') {
            result.message = '请输入手牌信息';
            return result;
        }
        
        // 2. 检查是否有两张牌（格式：牌+花色 牌+花色）
        const cardMatches = input.match(/[AKQJT2-9][shdc]/gi);
        if (!cardMatches || cardMatches.length < 2) {
            // 检查缺少什么
            const rankMatches = input.match(/[AKQJT2-9]/gi);
            if (!rankMatches || rankMatches.length === 0) {
                result.message = '缺少：手牌（如A、K、Q等）';
            } else if (rankMatches.length === 1) {
                result.message = '缺少：第二张手牌';
            } else {
                // 有两张牌但没有花色
                result.message = '缺少：手牌花色（s=黑桃,h=红心,d=方块,c=梅花）';
            }
            return result;
        }
        
        // 3. 检查是否有盈亏符号和数额
        const amountMatch = input.match(/([+-])([AKQJT0-9]+)$/);
        if (!amountMatch) {
            // 检查具体缺少什么
            if (!input.match(/[+-]/)) {
                result.message = '缺少：盈亏符号（+表示赢，-表示输）';
            } else {
                result.message = '缺少：盈亏数额（数字）';
            }
            return result;
        }
        
        // 4. 检查两张牌是否重复
        const cards = cardMatches.slice(0, 2).map(c => c.toUpperCase());
        if (cards[0] === cards[1]) {
            result.message = '错误：两张牌重复（' + cards[0] + '）';
            return result;
        }
        
        result.valid = true;
        return result;
    },

    saveHand() {
        const currentInput = this.data.currentInput;
        
        // 格式校验：检查输入是否符合 "牌+花色 牌+花色 +或-数额" 格式
        const validation = this.validateHandInput(currentInput);
        if (!validation.valid) {
            this.showToast('❌ ' + validation.message, 3000);
            return;
        }

        const cards = [];
        const matches = currentInput.match(/[AKQJT2-9][shdc]?/gi) || [];

        for (const match of matches.slice(0, 2)) {
            const rank = match[0].toUpperCase();
            const suit = match[1] ? match[1].toUpperCase() : null;
            cards.push({ rank, suit });
        }

        let amount = 0;
        const amountMatch = currentInput.match(/([+-])([AKQJT0-9]+)$/);
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

    showToast(message, duration = 1500) {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) existingToast.remove();
        
        // 根据消息类型判断颜色
        const isSuccess = message.includes('✓') || message.includes('成功');
        const bgColor = isSuccess ? 'rgba(74, 222, 128, 0.95)' : 'rgba(248, 113, 113, 0.95)';
        const textColor = isSuccess ? '#000' : '#fff';
        
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${bgColor};
            color: ${textColor};
            padding: 16px 24px;
            border-radius: 12px;
            z-index: 300;
            font-size: 15px;
            font-weight: 500;
            text-align: center;
            max-width: 80%;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
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

            // 构建展开后的详细行动
            let detailHtml = '';
            if (h.position || h.preflop || h.flop || h.turn || h.river) {
                const preflop = h.preflop ? `<div class="action-row"><span class="stage-badge preflop">PREFLOP</span> ${h.preflop}</div>` : '';
                
                // Flop牌面（单独显示）
                let flopCards = '';
                if (h.flopCards && h.flopSuits) {
                    flopCards = h.flopCards.map((r, i) => {
                        const s = h.flopSuits[i];
                        const suitClass = s === 'H' ? 'suit-red' : s === 'D' ? 'suit-blue' : s === 'C' ? 'suit-green' : 'suit-black';
                        const suitSymbol = s ? {S: '♠', H: '♥', D: '♦', C: '♣'}[s] : '';
                        return `<span class="${suitClass}">${r}${suitSymbol}</span>`;
                    }).join('');
                } else if (h.flopCards) {
                    flopCards = h.flopCards.join('');
                }
                const flop = h.flop ? `<div class="action-row"><span class="stage-badge flop">FLOP</span> ${flopCards ? flopCards + ' | ' : ''}${h.flop}</div>` : '';
                
                // Turn牌面（单独显示）
                let turnCard = '';
                if (h.turnCard && h.turnSuit) {
                    const suitClass = h.turnSuit === 'H' ? 'suit-red' : h.turnSuit === 'D' ? 'suit-blue' : h.turnSuit === 'C' ? 'suit-green' : 'suit-black';
                    const suitSymbol = {S: '♠', H: '♥', D: '♦', C: '♣'}[h.turnSuit] || '';
                    turnCard = `<span class="${suitClass}">${h.turnCard}${suitSymbol}</span>`;
                } else if (h.turnCard) {
                    turnCard = h.turnCard;
                }
                const turn = h.turn ? `<div class="action-row"><span class="stage-badge turn">TURN</span> ${turnCard ? turnCard + ' | ' : ''}${h.turn}</div>` : '';
                
                // River牌面（单独显示）
                let riverCard = '';
                if (h.riverCard && h.riverSuit) {
                    const suitClass = h.riverSuit === 'H' ? 'suit-red' : h.riverSuit === 'D' ? 'suit-blue' : h.riverSuit === 'C' ? 'suit-green' : 'suit-black';
                    const suitSymbol = {S: '♠', H: '♥', D: '♦', C: '♣'}[h.riverSuit] || '';
                    riverCard = `<span class="${suitClass}">${h.riverCard}${suitSymbol}</span>`;
                } else if (h.riverCard) {
                    riverCard = h.riverCard;
                }
                const river = h.river ? `<div class="action-row"><span class="stage-badge river">RIVER</span> ${riverCard ? riverCard + ' | ' : ''}${h.river}</div>` : '';
                
                detailHtml = `
                    <div class="hand-detail-expand">
                        ${preflop}
                        ${flop}
                        ${turn}
                        ${river}
                        <div class="edit-btn-row">
                            <button class="btn-edit-inline" onclick="event.stopPropagation(); app.openEditor(${h.id})">编辑牌谱</button>
                            <button class="btn-ai-inline" onclick="event.stopPropagation(); app.quickAIReview(${h.id})">🤖 AI复盘</button>
                        </div>
                    </div>
                `;
            } else {
                // 没有详情时显示提示和编辑按钮
                detailHtml = `
                    <div class="hand-detail-expand">
                        <div class="no-actions-tip">暂无详细记录</div>
                        <div class="edit-btn-row">
                            <button class="btn-edit-inline" onclick="event.stopPropagation(); app.openEditor(${h.id})">录入牌谱</button>
                            <button class="btn-ai-inline" onclick="event.stopPropagation(); app.quickAIReview(${h.id})">🤖 AI复盘</button>
                        </div>
                    </div>
                `;
            }

            // 紧凑摘要行 - 显示位置+完整牌面（包含彩色花色）
            const position = h.position || '';
            
            // 构建牌面显示（包含彩色花色）
            let boardDisplay = '';
            if (h.flopCards && h.flopSuits) {
                const flopWithSuits = h.flopCards.map((rank, i) => {
                    const suit = h.flopSuits[i];
                    const suitClass = suit === 'H' ? 'suit-red' : suit === 'D' ? 'suit-blue' : suit === 'C' ? 'suit-green' : 'suit-black';
                    const suitSymbol = suit ? {S: '♠', H: '♥', D: '♦', C: '♣'}[suit] : '';
                    return `<span class="${suitClass}">${rank}${suitSymbol}</span>`;
                }).join('');
                boardDisplay = flopWithSuits;
            } else if (h.flopCards) {
                boardDisplay = h.flopCards.join('');
            }
            
            if (h.turnCard && h.turnSuit) {
                const suitClass = h.turnSuit === 'H' ? 'suit-red' : h.turnSuit === 'D' ? 'suit-blue' : h.turnSuit === 'C' ? 'suit-green' : 'suit-black';
                const suitSymbol = {S: '♠', H: '♥', D: '♦', C: '♣'}[h.turnSuit] || '';
                boardDisplay += `/<span class="${suitClass}">${h.turnCard}${suitSymbol}</span>`;
            } else if (h.turnCard) {
                boardDisplay += '/' + h.turnCard;
            }
            
            if (h.riverCard && h.riverSuit) {
                const suitClass = h.riverSuit === 'H' ? 'suit-red' : h.riverSuit === 'D' ? 'suit-blue' : h.riverSuit === 'C' ? 'suit-green' : 'suit-black';
                const suitSymbol = {S: '♠', H: '♥', D: '♦', C: '♣'}[h.riverSuit] || '';
                boardDisplay += `/<span class="${suitClass}">${h.riverCard}${suitSymbol}</span>`;
            } else if (h.riverCard) {
                boardDisplay += '/' + h.riverCard;
            }
            
            const summary = position + (boardDisplay ? ` | ${boardDisplay}` : '');

            return `
                <div class="hand-item" data-id="${h.id}">
                    <div class="hand-summary">
                        <div class="hand-cards-small">${cardsHtml}</div>
                        <div class="hand-info">
                            <div class="hand-line1">
                                <span class="hand-name">${h.handName}</span>
                                <span class="hand-time">${time}</span>
                            </div>
                            <div class="hand-line2">
                                ${summary ? `<span class="hand-pos">${summary}</span>` : '<span class="no-detail">点击展开添加详情</span>'}
                            </div>
                        </div>
                        <div class="hand-amount ${h.amount >= 0 ? 'win' : 'loss'}">
                            ${h.amount >= 0 ? '+' : ''}${h.amount}
                        </div>
                        <div class="expand-icon">▼</div>
                    </div>
                    ${detailHtml}
                </div>
            `;
        }).join('');

        // 绑定点击展开/收起事件
        container.querySelectorAll('.hand-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是已经展开的，则收起
                if (item.classList.contains('expanded')) {
                    item.classList.remove('expanded');
                } else {
                    // 先收起其他所有
                    container.querySelectorAll('.hand-item').forEach(i => i.classList.remove('expanded'));
                    // 展开当前
                    item.classList.add('expanded');
                }
            });
        });
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
        // 填充Flop牌面显示
        if (hand.flopCards && hand.flopSuits) {
            this.updateCardSlot('flop-1', hand.flopCards[0], hand.flopSuits[0]);
            this.updateCardSlot('flop-2', hand.flopCards[1], hand.flopSuits[1]);
            this.updateCardSlot('flop-3', hand.flopCards[2], hand.flopSuits[2]);
        }
        if (hand.flop) document.getElementById('flop-action').value = hand.flop;
        
        // 填充Turn牌面显示
        if (hand.turnCard && hand.turnSuit) {
            this.updateCardSlot('turn-card', hand.turnCard, hand.turnSuit);
        }
        if (hand.turn) document.getElementById('turn-action').value = hand.turn;
        
        // 填充River牌面显示
        if (hand.riverCard && hand.riverSuit) {
            this.updateCardSlot('river-card', hand.riverCard, hand.riverSuit);
        }
        if (hand.river) document.getElementById('river-action').value = hand.river;
        if (hand.note) document.getElementById('hand-note').value = hand.note;

        // 显示编辑器
        document.getElementById('hand-editor').style.display = 'flex';
    },

    closeEditor() {
        document.getElementById('hand-editor').style.display = 'none';
        this.editingHandId = null;
        this.currentCardSlot = null;

        // 清空表单
        document.querySelectorAll('.pos-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('preflop-action').value = '';
        
        // 清空牌面选择
        ['flop-1', 'flop-2', 'flop-3', 'turn-card', 'river-card'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = '';
                input.dataset.rank = '';
                input.dataset.suit = '';
            }
            const slot = document.querySelector(`[data-slot="${id}"]`);
            if (slot) {
                slot.classList.remove('has-card', 'red');
                slot.querySelector('.card-rank').textContent = '';
                slot.querySelector('.card-suit').textContent = '';
            }
        });
        
        document.getElementById('flop-action').value = '';
        document.getElementById('turn-action').value = '';
        document.getElementById('river-action').value = '';
        document.getElementById('hand-note').value = '';
        
        // 关闭牌面选择弹窗
        this.closeCardPicker();
    },

    saveEditor() {
        if (!this.editingHandId) return;

        const hand = this.data.hands.find(h => h.id === this.editingHandId);
        if (!hand) return;

        // 校验公共牌是否有重复
        const slots = ['flop-1', 'flop-2', 'flop-3', 'turn-card', 'river-card'];
        const seenCards = new Set();
        
        for (const slotId of slots) {
            const input = document.getElementById(slotId);
            if (input && input.value) {
                if (seenCards.has(input.value)) {
                    this.showToast('❌ 公共牌有重复：' + input.value, 2000);
                    return;
                }
                seenCards.add(input.value);
            }
        }

        // 保存位置
        const activePos = document.querySelector('.pos-btn.active');
        if (activePos) hand.position = activePos.dataset.pos;

        // 保存各阶段数据
        hand.preflop = document.getElementById('preflop-action').value;
        
        // 保存Flop牌面（包含花色）
        const flop1 = document.getElementById('flop-1');
        const flop2 = document.getElementById('flop-2');
        const flop3 = document.getElementById('flop-3');
        hand.flopCards = [flop1.dataset.rank, flop2.dataset.rank, flop3.dataset.rank].filter(r => r);
        hand.flopSuits = [flop1.dataset.suit, flop2.dataset.suit, flop3.dataset.suit].filter(s => s);
        hand.flop = document.getElementById('flop-action').value;
        
        // 保存Turn牌面（包含花色）
        const turnCard = document.getElementById('turn-card');
        hand.turnCard = turnCard.dataset.rank;
        hand.turnSuit = turnCard.dataset.suit;
        hand.turn = document.getElementById('turn-action').value;
        
        // 保存River牌面（包含花色）
        const riverCard = document.getElementById('river-card');
        hand.riverCard = riverCard.dataset.rank;
        hand.riverSuit = riverCard.dataset.suit;
        hand.river = document.getElementById('river-action').value;
        
        hand.note = document.getElementById('hand-note').value;
        hand.reviewed = true;

        this.saveData();
        this.closeEditor();
        this.loadReviewData(); // 刷新复盘列表
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
        document.getElementById('btn-ai-review')?.addEventListener('click', () => this.showAIReview());
        document.getElementById('ai-modal-close')?.addEventListener('click', () => this.hideAIReview());
        document.getElementById('ai-modal-mask')?.addEventListener('click', () => this.hideAIReview());

        // 位置按钮
        document.querySelectorAll('.pos-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },

    // 牌面选择相关
    currentCardSlot: null,

    openCardPicker(slotId) {
        this.currentCardSlot = slotId;
        
        // 每次都重新创建弹窗内容，确保显示牌面选择第一步
        let popup = document.getElementById('card-picker-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'card-picker-popup';
            popup.className = 'card-picker-popup';
            document.body.appendChild(popup);
        }
        
        // 重置为牌面选择界面
        popup.innerHTML = `
            <button class="popup-close" onclick="app.closeCardPicker()">✕</button>
            <div class="card-picker-title">选择牌面</div>
            <div class="rank-selector">
                ${['A','K','Q','J','T','9','8','7','6','5','4','3','2'].map(r => 
                    `<button class="rank-btn" data-rank="${r}" onclick="app.selectCardRank('${r}')">${r}</button>`
                ).join('')}
            </div>
        `;
        
        popup.classList.add('show');
        
        // 添加遮罩
        let overlay = document.getElementById('card-picker-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'card-picker-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:399;display:none;';
            overlay.onclick = () => this.closeCardPicker();
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';
    },

    selectCardRank(rank) {
        // 显示花色选择
        const popup = document.getElementById('card-picker-popup');
        popup.innerHTML = `
            <button class="popup-close" onclick="app.closeCardPicker()">✕</button>
            <div class="card-picker-title">${rank} - 选择花色</div>
            <div class="suit-selector">
                <button class="suit-option" onclick="app.selectCardSuit('S')">♠</button>
                <button class="suit-option red" onclick="app.selectCardSuit('H')">♥</button>
                <button class="suit-option red" onclick="app.selectCardSuit('D')">♦</button>
                <button class="suit-option" onclick="app.selectCardSuit('C')">♣</button>
            </div>
        `;
        this.tempRank = rank;
    },

    selectCardSuit(suit) {
        if (!this.currentCardSlot || !this.tempRank) return;
        
        // 检查是否重复选择相同的牌
        const newCard = this.tempRank + suit;
        const slots = ['flop-1', 'flop-2', 'flop-3', 'turn-card', 'river-card'];
        
        for (const slotId of slots) {
            if (slotId === this.currentCardSlot) continue; // 跳过当前slot
            
            const input = document.getElementById(slotId);
            if (input && input.value === newCard) {
                this.showToast('❌ 不能重复选择：' + this.tempRank + {S: '♠', H: '♥', D: '♦', C: '♣'}[suit], 2000);
                this.closeCardPicker();
                this.tempRank = null;
                return;
            }
        }
        
        this.updateCardSlot(this.currentCardSlot, this.tempRank, suit);
        this.closeCardPicker();
        this.tempRank = null;
    },

    updateCardSlot(slotId, rank, suit) {
        const input = document.getElementById(slotId);
        const slot = document.querySelector(`[data-slot="${slotId}"]`);
        
        if (input) {
            input.dataset.rank = rank || '';
            input.dataset.suit = suit || '';
            input.value = rank + suit;
        }
        
        if (slot) {
            const rankEl = slot.querySelector('.card-rank');
            const suitEl = slot.querySelector('.card-suit');
            
            if (rank && suit) {
                rankEl.textContent = rank;
                suitEl.textContent = {S: '♠', H: '♥', D: '♦', C: '♣'}[suit] || '';
                slot.classList.add('has-card');
                if (suit === 'H' || suit === 'D') {
                    slot.classList.add('red');
                } else {
                    slot.classList.remove('red');
                }
            } else {
                rankEl.textContent = '';
                suitEl.textContent = '';
                slot.classList.remove('has-card', 'red');
            }
        }
    },

    // ========== 快速AI复盘（不打开编辑器） ==========
    quickAIReview(handId) {
        const hand = this.data.hands.find(h => h.id === handId);
        if (!hand) return;
        
        const modal = document.getElementById('ai-modal');
        const loading = document.getElementById('ai-loading');
        const result = document.getElementById('ai-result');
        
        modal.style.display = 'flex';
        loading.style.display = 'flex';
        result.style.display = 'none';
        
        // 使用手牌数据生成分析
        setTimeout(() => {
            const analysis = this.generateAIAnalysisForHand(hand);
            result.innerHTML = analysis;
            loading.style.display = 'none';
            result.style.display = 'block';
        }, 800);
    },
    
    // 为指定手牌生成AI分析
    generateAIAnalysisForHand(hand) {
        const amount = hand.amount || 0;
        const position = hand.position || '';
        const cards = hand.cards || [];
        const action = hand.action || '';
        
        // 计算基础评分
        let score = 5;
        let scoreClass = 'medium';
        let scoreLabel = '标准';
        
        if (amount > 0) {
            score = Math.min(7 + Math.floor(amount / 10000), 10);
            scoreLabel = '盈利';
            scoreClass = score >= 8 ? 'good' : 'medium';
        } else if (amount < 0) {
            score = Math.max(3 - Math.floor(Math.abs(amount) / 10000), 1);
            scoreClass = 'poor';
            scoreLabel = '亏损';
        }
        
        // 判断手牌类型
        const isPocketPair = cards.length === 2 && cards[0].rank === cards[1].rank;
        const isSuited = cards.length === 2 && cards[0].suit === cards[1].suit;
        const isConnected = cards.length === 2 && 
            Math.abs(this.getRankValue(cards[0].rank) - this.getRankValue(cards[1].rank)) === 1;
        
        // 生成HTML
        let html = '';
        
        // 手牌信息
        html += '<div class="ai-hand-info">';
        html += '<div class="ai-hand-cards">';
        cards.forEach(card => {
            const isRed = card.suit === 'H' || card.suit === 'D';
            const suitSymbol = {S: '♠', H: '♥', D: '♦', C: '♣'}[card.suit];
            html += `<div class="ai-mini-card ${isRed ? 'red' : 'black'}">${card.rank}${suitSymbol}</div>`;
        });
        html += '</div>';
        html += '<div><div class="ai-hand-name">' + hand.handName + '</div>';
        if (position) html += '<span style="color:var(--primary);font-size:12px;">' + position + '</span>';
        if (action) html += ' | <span style="color:#fbbf24;font-size:12px;">' + action + '</span>';
        html += '</div></div>';
        
        // GTO评分
        html += '<div class="ai-score">';
        html += `<div class="ai-score-value ${scoreClass}">${score}/10</div>`;
        html += `<div class="ai-score-label">${scoreLabel}</div>`;
        html += '</div>';
        
        // 手牌特征
        html += '<h3>🎴 手牌特征</h3>';
        
        if (isPocketPair) {
            html += '<div class="ai-suggestion">';
            html += '<span class="ai-suggestion-label strategy">对子</span>';
            html += '<div class="ai-suggestion-text">口袋对子，翻后有set mining价值，注意底池赔率</div>';
            html += '</div>';
        }
        
        if (isSuited) {
            html += '<div class="ai-suggestion">';
            html += '<span class="ai-suggestion-label opportunity">同花</span>';
            html += '<div class="ai-suggestion-text">同花结构牌，翻后有成花潜力，适合 IP 3B</div>';
            html += '</div>';
        }
        
        if (isConnected) {
            html += '<div class="ai-suggestion">';
            html += '<span class="ai-suggestion-label info">连张</span>';
            html += '<div class="ai-suggestion-text">连张牌型，有顺子听牌潜力</div>';
            html += '</div>';
        }
        
        // 位置分析
        if (position) {
            html += '<h3>📍 位置分析</h3>';
            
            const earlyPositions = ['UTG', 'UTG+1', 'UTG+2', 'MP'];
            const latePositions = ['CO', 'BTN'];
            
            if (earlyPositions.includes(position)) {
                if (!isPocketPair && cards[0] && this.getRankValue(cards[0].rank) < 12) {
                    html += '<div class="ai-suggestion">';
                    html += '<span class="ai-suggestion-label warning">位置</span>';
                    html += '<div class="ai-suggestion-text">前位入池手牌偏弱，建议收紧范围到88+/AQs+/AK</div>';
                    html += '</div>';
                } else {
                    html += '<div class="ai-suggestion">';
                    html += '<span class="ai-suggestion-label info">位置</span>';
                    html += '<div class="ai-suggestion-text">前位 open，确保手牌质量足够</div>';
                    html += '</div>';
                }
            } else if (latePositions.includes(position)) {
                html += '<div class="ai-suggestion">';
                html += '<span class="ai-suggestion-label opportunity">位置</span>';
                html += '<div class="ai-suggestion-text">后位有位置优势，可以更激进地3B隔离</div>';
                html += '</div>';
            }
        }
        
        // 结果分析
        if (amount > 30000) {
            html += '<h3>🎉 关键胜利</h3>';
            html += '<div class="ai-suggestion">';
            html += '<span class="ai-suggestion-label opportunity">大胜</span>';
            html += '<div class="ai-suggestion-text">这手牌盈利显著！回顾关键决策，总结可复制的手感</div>';
            html += '</div>';
        } else if (amount < -20000) {
            html += '<h3>⚠️ 大额亏损</h3>';
            html += '<div class="ai-error">';
            html += '<div class="ai-error-street">总结</div>';
            html += '<div class="ai-error-text">大额亏损手牌，建议点击"编辑牌谱"详细记录心路历程，检查是否存在Tilt、位置劣势或范围错误</div>';
            html += '</div>';
        }
        
        return html;
    },
    
    // 获取牌面数值
    getRankValue(rank) {
        const values = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10 };
        return values[rank] || parseInt(rank) || 0;
    },
        const popup = document.getElementById('card-picker-popup');
        if (popup) popup.classList.remove('show');
        const overlay = document.getElementById('card-picker-overlay');
        if (overlay) overlay.style.display = 'none';
        this.currentCardSlot = null;
        this.tempRank = null;
    },

    // ========== AI复盘功能 ==========
    showAIReview() {
        const modal = document.getElementById('ai-modal');
        const loading = document.getElementById('ai-loading');
        const result = document.getElementById('ai-result');
        
        modal.style.display = 'flex';
        loading.style.display = 'flex';
        result.style.display = 'none';
        
        // 模拟AI分析延迟
        setTimeout(() => {
            const analysis = this.generateAIAnalysis();
            result.innerHTML = analysis;
            loading.style.display = 'none';
            result.style.display = 'block';
        }, 1500);
    },
    
    hideAIReview() {
        const modal = document.getElementById('ai-modal');
        modal.style.display = 'none';
    },
    
    generateAIAnalysis() {
        // 获取当前编辑的手牌信息
        const hand = this.data.hands.find(h => h.id === this.editingHandId);
        if (!hand) return '<p>暂无手牌信息</p>';
        
        const amount = hand.amount || 0;
        const position = hand.position || '';
        const cards = hand.cards || [];
        
        // 计算基础评分
        let score = 5;
        let scoreClass = 'medium';
        let scoreLabel = '标准';
        
        if (amount > 0) {
            score = Math.min(7 + Math.floor(amount / 10000), 10);
            scoreLabel = '盈利';
        } else if (amount < 0) {
            score = Math.max(3 - Math.floor(Math.abs(amount) / 10000), 1);
            scoreClass = 'poor';
            scoreLabel = '亏损';
        } else {
            scoreClass = 'medium';
        }
        
        // 判断手牌类型
        const isPocketPair = cards.length === 2 && cards[0].rank === cards[1].rank;
        const isSuited = cards.length === 2 && cards[0].suit === cards[1].suit;
        
        // 生成HTML
        let html = '';
        
        // 手牌信息
        html += `<div class="ai-hand-info">`;
        html += `<div class="ai-hand-cards">`;
        cards.forEach(card => {
            const isRed = card.suit === 'H' || card.suit === 'D';
            const suitSymbol = {S: '♠', H: '♥', D: '♦', C: '♣'}[card.suit];
            html += `<div class="ai-mini-card ${isRed ? 'red' : 'black'}">${card.rank}${suitSymbol}</div>`;
        });
        html += `</div>`;
        html += `<div><div class="ai-hand-name">${hand.handName}</div>`;
        if (position) html += `<span style="color:var(--primary);font-size:12px;">${position}</span>`;
        html += `</div></div>`;
        
        // GTO评分
        html += `<div class="ai-score">`;
        html += `<div class="ai-score-value ${scoreClass}">${score}/10</div>`;
        html += `<div class="ai-score-label">${scoreLabel}</div>`;
        html += `</div>`;
        
        // 分析建议
        html += `<h3>💡 关键建议</h3>`;
        
        // 位置分析
        if (position) {
            const earlyPositions = ['UTG', 'UTG+1', 'UTG+2', 'MP'];
            const latePositions = ['CO', 'BTN'];
            
            if (earlyPositions.includes(position) && !isPocketPair) {
                const rankValues = {'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10};
                const highCard = rankValues[cards[0].rank] || parseInt(cards[0].rank);
                if (highCard < 12) {
                    html += `<div class="ai-suggestion">`;
                    html += `<span class="ai-suggestion-label warning">位置</span>`;
                    html += `<div class="ai-suggestion-text">前位入池手牌偏弱，建议收紧范围到88+/AQs+/AK</div>`;
                    html += `</div>`;
                }
            }
            
            if (latePositions.includes(position)) {
                html += `<div class="ai-suggestion">`;
                html += `<span class="ai-suggestion-label info">位置</span>`;
                html += `<div class="ai-suggestion-text">后位有位置优势，可以更激进地3B隔离</div>`;
                html += `</div>`;
            }
        }
        
        // 手牌类型分析
        if (isPocketPair) {
            html += `<div class="ai-suggestion">`;
            html += `<span class="ai-suggestion-label strategy">策略</span>`;
            html += `<div class="ai-suggestion-text">对子在手，注意翻后set mining价值</div>`;
            html += `</div>`;
        }
        
        if (isSuited) {
            html += `<div class="ai-suggestion">`;
            html += `<span class="ai-suggestion-label opportunity">机会</span>`;
            html += `<div class="ai-suggestion-text">同花结构牌，有翻后成花潜力</div>`;
            html += `</div>`;
        }
        
        // 结果分析
        if (amount > 30000) {
            html += `<div class="ai-suggestion">`;
            html += `<span class="ai-suggestion-label opportunity">大胜</span>`;
            html += `<div class="ai-suggestion-text">这手牌盈利显著！回顾关键决策，总结可复制的手感</div>`;
            html += `</div>`;
        } else if (amount < -20000) {
            html += `<h3>⚠️ 潜在错误</h3>`;
            html += `<div class="ai-error">`;
            html += `<div class="ai-error-street">总结</div>`;
            html += `<div class="ai-error-text">大额亏损手牌，建议详细记录心路历程，检查是否存在Tilt、位置劣势或范围错误</div>`;
            html += `</div>`;
        }
        
        return html;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
