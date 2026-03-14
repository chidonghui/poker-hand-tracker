// pages/hand-detail/hand-detail.js
Page({
  data: {
    handId: null,
    hand: {},
    evInput: '',
    evSign: '+',
    flopInput: '',
    turnInput: '',
    riverInput: '',
    parsedFlop: [],
    parsedTurn: {},
    parsedRiver: {},
    // AI复盘相关
    showAIModal: false,
    aiLoading: false,
    aiAnalysis: {
      score: 0,
      scoreLabel: '',
      suggestions: [],
      errors: [],
      rangeAnalysis: ''
    }
  },

  onLoad(options) {
    const id = parseInt(options.id)
    this.setData({ handId: id })
    this.loadHand(id)
  },

  loadHand(id) {
    const hands = wx.getStorageSync('pokerHands') || []
    const hand = hands.find(h => h.id === id)
    
    if (hand) {
      // 处理 EV 显示
      let evInput = ''
      let evSign = '+'
      if (hand.ev !== null && hand.ev !== undefined) {
        evInput = Math.abs(hand.ev).toString()
        evSign = hand.ev >= 0 ? '+' : '-'
      }
      
      // 处理公共牌显示
      let flopInput = ''
      let turnInput = ''
      let riverInput = ''
      
      if (hand.communityCards) {
        if (hand.communityCards.flop) {
          flopInput = hand.communityCards.flop.map(c => c.rank + c.suit.toLowerCase()).join('')
        }
        if (hand.communityCards.turn) {
          turnInput = hand.communityCards.turn.rank + hand.communityCards.turn.suit.toLowerCase()
        }
        if (hand.communityCards.river) {
          riverInput = hand.communityCards.river.rank + hand.communityCards.river.suit.toLowerCase()
        }
      }
      
      this.setData({
        hand,
        evInput,
        evSign,
        flopInput,
        turnInput,
        riverInput,
        parsedFlop: hand.communityCards?.flop || [],
        parsedTurn: hand.communityCards?.turn || {},
        parsedRiver: hand.communityCards?.river || {}
      })
    }
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  // 解析单张牌
  parseCard(input) {
    if (!input || input.length < 2) return null
    
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
    const suitMap = { 's': 'S', 'h': 'H', 'c': 'C', 'd': 'D' }
    
    const rank = input[0].toUpperCase()
    const suit = suitMap[input[1].toLowerCase()]
    
    if (!ranks.includes(rank) || !suit) return null
    
    const suitNames = { 'S': 'spade', 'H': 'heart', 'C': 'club', 'D': 'diamond' }
    
    return {
      rank,
      suit,
      suitName: suitNames[suit]
    }
  },

  // 解析 Flop (3张牌)，带重复校验
  parseFlop(input) {
    if (!input || input.length < 6) return []
    
    const cards = []
    const seen = new Set() // 用于检测重复
    const cleanInput = input.replace(/\s/g, '').toLowerCase()
    
    for (let i = 0; i < cleanInput.length && cards.length < 3; i += 2) {
      const cardStr = cleanInput.substr(i, 2)
      const card = this.parseCard(cardStr)
      if (card) {
        const cardKey = card.rank + card.suit
        // 检查是否重复
        if (seen.has(cardKey)) {
          wx.showToast({
            title: `重复：${card.rank}${this.getSuitSymbol(card.suit)}`,
            icon: 'none',
            duration: 2000
          })
          return cards // 返回已解析的不重复牌
        }
        seen.add(cardKey)
        cards.push(card)
      }
    }
    
    return cards
  },
  
  // 获取花色符号
  getSuitSymbol(suit) {
    const symbols = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' }
    return symbols[suit] || suit
  },

  onFlopInput(e) {
    const value = e.detail.value
    const parsed = this.parseFlop(value)
    this.setData({
      flopInput: value,
      parsedFlop: parsed
    })
  },

  onTurnInput(e) {
    const value = e.detail.value
    const parsed = this.parseCard(value)
    
    // 检查是否和 Flop 重复
    if (parsed) {
      const cardKey = parsed.rank + parsed.suit
      const flopCards = this.data.parsedFlop || []
      const isDuplicateInFlop = flopCards.some(c => c.rank + c.suit === cardKey)
      
      if (isDuplicateInFlop) {
        wx.showToast({
          title: `已在Flop：${parsed.rank}${this.getSuitSymbol(parsed.suit)}`,
          icon: 'none',
          duration: 2000
        })
        this.setData({
          turnInput: '',
          parsedTurn: {}
        })
        return
      }
      
      // 检查是否和 River 重复
      const riverCard = this.data.parsedRiver
      if (riverCard && riverCard.rank && riverCard.rank + riverCard.suit === cardKey) {
        wx.showToast({
          title: `已在River：${parsed.rank}${this.getSuitSymbol(parsed.suit)}`,
          icon: 'none',
          duration: 2000
        })
        this.setData({
          turnInput: '',
          parsedTurn: {}
        })
        return
      }
    }
    
    this.setData({
      turnInput: value,
      parsedTurn: parsed || {}
    })
  },

  onRiverInput(e) {
    const value = e.detail.value
    const parsed = this.parseCard(value)
    
    // 检查是否和 Flop 重复
    if (parsed) {
      const cardKey = parsed.rank + parsed.suit
      const flopCards = this.data.parsedFlop || []
      const isDuplicateInFlop = flopCards.some(c => c.rank + c.suit === cardKey)
      
      if (isDuplicateInFlop) {
        wx.showToast({
          title: `已在Flop：${parsed.rank}${this.getSuitSymbol(parsed.suit)}`,
          icon: 'none',
          duration: 2000
        })
        this.setData({
          riverInput: '',
          parsedRiver: {}
        })
        return
      }
      
      // 检查是否和 Turn 重复
      const turnCard = this.data.parsedTurn
      if (turnCard && turnCard.rank && turnCard.rank + turnCard.suit === cardKey) {
        wx.showToast({
          title: `已在Turn：${parsed.rank}${this.getSuitSymbol(parsed.suit)}`,
          icon: 'none',
          duration: 2000
        })
        this.setData({
          riverInput: '',
          parsedRiver: {}
        })
        return
      }
    }
    
    this.setData({
      riverInput: value,
      parsedRiver: parsed || {}
    })
  },

  setPosition(e) {
    const pos = e.currentTarget.dataset.pos
    this.setData({
      'hand.position': pos
    })
  },

  setAction(e) {
    const action = e.currentTarget.dataset.action
    this.setData({
      'hand.action': action
    })
  },

  setEVSign(e) {
    const sign = e.currentTarget.dataset.sign
    this.setData({ evSign: sign })
  },

  onEVInput(e) {
    this.setData({ evInput: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({
      'hand.note': e.detail.value
    })
  },

  saveReview() {
    const { handId, hand, evInput, evSign, parsedFlop, parsedTurn, parsedRiver } = this.data
    
    // 计算 EV
    let ev = null
    if (evInput) {
      ev = parseInt(evSign + evInput)
    }
    
    // 构建公共牌数据
    const communityCards = {}
    if (parsedFlop.length === 3) communityCards.flop = parsedFlop
    if (parsedTurn && parsedTurn.rank) communityCards.turn = parsedTurn
    if (parsedRiver && parsedRiver.rank) communityCards.river = parsedRiver
    
    // 更新手牌
    const hands = wx.getStorageSync('pokerHands') || []
    const index = hands.findIndex(h => h.id === handId)
    
    if (index !== -1) {
      hands[index] = {
        ...hands[index],
        ...hand,
        ev,
        communityCards: Object.keys(communityCards).length > 0 ? communityCards : null,
        reviewed: true
      }
      
      wx.setStorageSync('pokerHands', hands)
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    }
  },

  deleteHand() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这手牌吗？此操作不可恢复。',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          const { handId } = this.data
          let hands = wx.getStorageSync('pokerHands') || []
          hands = hands.filter(h => h.id !== handId)
          wx.setStorageSync('pokerHands', hands)
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
          
          setTimeout(() => {
            wx.navigateBack()
          }, 1000)
        }
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  // ========== AI复盘功能 ==========
  
  // 显示AI复盘弹窗
  showAIReview() {
    this.setData({ showAIModal: true, aiLoading: true })
    
    // 模拟AI分析延迟
    setTimeout(() => {
      const analysis = this.generateAIAnalysis()
      this.setData({
        aiAnalysis: analysis,
        aiLoading: false
      })
    }, 1500)
  },
  
  // 隐藏AI复盘弹窗
  hideAIReview() {
    this.setData({ showAIModal: false })
  },
  
  // 生成AI分析（基于GTO规则）
  generateAIAnalysis() {
    const { hand, parsedFlop, parsedTurn, parsedRiver } = this.data
    const cards = hand.cards || []
    const position = hand.position || ''
    const action = hand.action || ''
    const amount = hand.amount || 0
    
    const analysis = {
      score: 5,
      scoreLabel: '标准',
      suggestions: [],
      errors: [],
      rangeAnalysis: ''
    }
    
    // 基础评分
    if (amount > 0) {
      analysis.score = Math.min(7 + Math.floor(amount / 10000), 10)
      analysis.scoreLabel = '盈利'
    } else if (amount < 0) {
      analysis.score = Math.max(3 - Math.floor(Math.abs(amount) / 10000), 1)
      analysis.scoreLabel = '亏损'
    }
    
    // 分析手牌类型
    const isPocketPair = cards.length === 2 && cards[0].rank === cards[1].rank
    const isSuited = cards.length === 2 && cards[0].suit === cards[1].suit
    const handRanks = cards.map(c => this.getRankValue(c.rank)).sort((a, b) => b - a)
    
    // 位置分析
    if (position) {
      const earlyPositions = ['UTG', 'UTG+1', 'UTG+2', 'MP']
      const latePositions = ['CO', 'BTN']
      
      if (earlyPositions.includes(position)) {
        if (!isPocketPair && handRanks[0] < 12) {
          analysis.suggestions.push({
            type: 'warning',
            typeText: '位置',
            text: '前位入池手牌偏弱，建议收紧范围到88+/AQs+/AK'
          })
        }
      }
      
      if (latePositions.includes(position) && action === 'Call') {
        analysis.suggestions.push({
          type: 'info',
          typeText: '位置',
          text: '后位有位置优势，可以更激进地3B隔离'
        })
      }
    }
    
    // 行动分析
    if (action === 'Open' && !position) {
      analysis.errors.push({
        street: '翻前',
        text: 'Open但未记录位置，无法判断范围是否合理',
        suggestion: '补充位置信息以获得更准确的GTO分析'
      })
    }
    
    // 公共牌分析
    const hasFlop = parsedFlop && parsedFlop.length === 3
    const hasTurn = parsedTurn && parsedTurn.rank
    const hasRiver = parsedRiver && parsedRiver.rank
    
    if (hasFlop && cards.length === 2) {
      // 检查是否中牌
      const flopRanks = parsedFlop.map(c => c.rank)
      const hitFlop = cards.some(c => flopRanks.includes(c.rank))
      
      if (!hitFlop && !isSuited) {
        analysis.suggestions.push({
          type: 'strategy',
          typeText: '策略',
          text: 'Flop未中牌且无听牌，建议控池或弃牌'
        })
      }
      
      // 检查听牌
      if (isSuited) {
        const suit = cards[0].suit
        const flopSuits = parsedFlop.filter(c => c.suit === suit).length
        if (flopSuits >= 2) {
          analysis.suggestions.push({
            type: 'opportunity',
            typeText: '机会',
            text: `有${flopSuits === 3 ? '花' : '花听'}，可以继续施压`
          })
        }
      }
    }
    
    // EV分析
    if (hand.ev !== null && hand.ev !== undefined) {
      const evDiff = hand.ev - amount
      if (Math.abs(evDiff) > 5000) {
        analysis.rangeAnalysis = `EV(${hand.ev})与实际结果(${amount})差距较大，建议复盘关键决策点`
      } else {
        analysis.rangeAnalysis = 'EV与实际结果基本一致，决策质量稳定'
      }
    } else {
      analysis.rangeAnalysis = '未记录EV，建议补充以便更精准分析'
    }
    
    // 结果导向的调整
    if (amount > 30000) {
      analysis.suggestions.unshift({
        type: 'highlight',
        typeText: '大胜',
        text: '这手牌盈利显著！回顾关键决策，总结可复制的手感'
      })
    } else if (amount < -20000) {
      analysis.errors.unshift({
        street: '总结',
        text: '大额亏损手牌，建议详细记录心路历程',
        suggestion: '检查是否存在Tilt、位置劣势或范围错误'
      })
    }
    
    return analysis
  },
  
  // 获取牌面数值
  getRankValue(rank) {
    const values = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10 }
    return values[rank] || parseInt(rank) || 0
  }
})