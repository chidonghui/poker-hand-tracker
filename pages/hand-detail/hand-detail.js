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
    parsedRiver: {}
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

  // 解析 Flop (3张牌)
  parseFlop(input) {
    if (!input || input.length < 6) return []
    
    const cards = []
    const cleanInput = input.replace(/\s/g, '').toLowerCase()
    
    for (let i = 0; i < cleanInput.length && cards.length < 3; i += 2) {
      const cardStr = cleanInput.substr(i, 2)
      const card = this.parseCard(cardStr)
      if (card) cards.push(card)
    }
    
    return cards
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
    this.setData({
      turnInput: value,
      parsedTurn: parsed || {}
    })
  },

  onRiverInput(e) {
    const value = e.detail.value
    const parsed = this.parseCard(value)
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
  }
})