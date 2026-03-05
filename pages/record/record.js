// pages/record/record.js
const app = getApp()

Page({
  data: {
    inputValue: '',
    parsedHand: {
      cards: [],
      amount: 0,
      handName: ''
    },
    currentTime: '',
    todayCount: 0,
    todayProfit: 0
  },

  onLoad() {
    this.updateTime()
    this.loadTodayStats()
    
    // 每秒更新时间
    setInterval(() => {
      this.updateTime()
    }, 1000)
  },

  onShow() {
    this.loadTodayStats()
  },

  updateTime() {
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    this.setData({ currentTime: timeStr })
  },

  loadTodayStats() {
    const hands = wx.getStorageSync('pokerHands') || []
    const today = new Date().toDateString()
    
    const todayHands = hands.filter(h => {
      const handDate = new Date(h.timestamp).toDateString()
      return handDate === today
    })
    
    const totalProfit = todayHands.reduce((sum, h) => sum + h.amount, 0)
    
    this.setData({
      todayCount: todayHands.length,
      todayProfit: totalProfit
    })
  },

  onInput(e) {
    const value = e.detail.value
    this.setData({ inputValue: value })
    
    // 解析输入
    const parsed = this.parseHand(value)
    this.setData({ parsedHand: parsed })
  },

  parseHand(input) {
    if (!input.trim()) {
      return { cards: [], amount: 0, suited: null, suits: [], handName: '' }
    }

    const result = {
      cards: [],
      amount: 0,
      suited: null,
      suits: [],
      handName: ''
    }

    // 解析金额 (支持空格分隔)
    const amountMatch = input.match(/([+-])\s*(\d+)/)
    if (amountMatch) {
      result.amount = parseInt(amountMatch[1] + amountMatch[2])
    }

    // 移除金额，解析手牌
    let handPart = input.replace(/[+-]\s*\d+/, '').trim().toUpperCase()

    // 牌面: A, K, Q, J, T, 9-2
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
    // 具体花色: S=黑桃♠️, H=红心❤️, C=梅花♣️, D=方块♦️
    const specificSuits = ['S', 'H', 'C', 'D']
    
    // Step 1: 先检查是否是 XYs 或 XYo 格式 (suited/off-suit 标记)
    // 例如: AKs, 56s, AKo, 78o
    const suitedPattern = /^([2-9TJQKA])([2-9TJQKA])([SO])$/
    const suitedMatch = handPart.match(suitedPattern)
    
    if (suitedMatch) {
      const rank1 = suitedMatch[1]
      const rank2 = suitedMatch[2]
      const marker = suitedMatch[3]
      
      result.cards = [
        { rank: rank1, suit: null, suitName: '' },
        { rank: rank2, suit: null, suitName: '' }
      ]
      result.suited = (marker === 'S')
      result.handName = rank1 + rank2 + marker.toLowerCase()
      return result
    }
    
    // Step 2: 检查是否是具体花色格式
    // 例如: AsKh, AK, AsK, AKs (小写s会被转为大写S，但上面已处理)
    // 重新用原始大小写解析具体花色
    let originalHandPart = input.replace(/[+-]\s*\d+/, '').trim()
    let i = 0
    let cardCount = 0
    
    while (i < originalHandPart.length && cardCount < 2) {
      const char = originalHandPart[i]
      const upperChar = char.toUpperCase()
      
      // 检查是否是牌面
      if (ranks.includes(upperChar)) {
        const rank = upperChar
        let suit = null
        
        // 检查下一位是否是具体花色（不区分大小写）
        if (i + 1 < originalHandPart.length) {
          const nextChar = originalHandPart[i + 1].toLowerCase()
          const suitMap = { 's': 'S', 'h': 'H', 'c': 'C', 'd': 'D' }
          if (suitMap[nextChar]) {
            suit = suitMap[nextChar]
            i += 2
          } else {
            i += 1
          }
        } else {
          i += 1
        }
        
        result.cards.push({
          rank: rank,
          suit: suit,
          suitName: this.getSuitName(suit)
        })
        cardCount++
      } else {
        i += 1
      }
    }

    // 判断 suited/off suit（基于具体花色）
    if (result.cards.length === 2) {
      const suit1 = result.cards[0].suit
      const suit2 = result.cards[1].suit
      
      if (suit1 && suit2) {
        // 两张都有具体花色
        result.suited = (suit1 === suit2)
      }
    }

    // 生成手牌名称
    if (result.cards.length === 2) {
      const card1 = result.cards[0]
      const card2 = result.cards[1]
      
      // 如果是口袋对
      if (card1.rank === card2.rank) {
        result.handName = card1.rank + card2.rank
      }
      // 如果两张都有具体花色
      else if (card1.suit && card2.suit) {
        result.handName = card1.rank + card1.suit.toLowerCase() + card2.rank + card2.suit.toLowerCase()
      }
      // suited同花色（但无具体花色）
      else if (result.suited === true) {
        result.handName = card1.rank + card2.rank + 's'
      }
      // off suit不同花色（但无具体花色）
      else if (result.suited === false) {
        result.handName = card1.rank + card2.rank + 'o'
      }
      // 未指定
      else {
        result.handName = card1.rank + card2.rank
      }
    } else if (result.cards.length === 1) {
      const card = result.cards[0]
      if (card.suit) {
        result.handName = card.rank + card.suit.toLowerCase()
      } else {
        result.handName = card.rank
      }
    }

    return result
  },

  getSuitName(suit) {
    if (!suit) return ''
    const lowerSuit = suit.toLowerCase()
    const map = {
      's': 'spade',    // 黑桃♠️
      'h': 'heart',    // 红心❤️
      'c': 'club',     // 梅花♣️
      'd': 'diamond'   // 方块♦️
    }
    return map[lowerSuit] || ''
  },

  quickInput(e) {
    const text = e.currentTarget.dataset.text
    const currentValue = this.data.inputValue
    
    let newValue
    if (text === '清除') {
      newValue = ''
    } else if (text === '+' || text === '-') {
      // 替换已有的正负号
      newValue = currentValue.replace(/[+-]/, '') + text
    } else {
      newValue = currentValue + text
    }
    
    this.setData({ inputValue: newValue })
    
    // 重新解析
    const parsed = this.parseHand(newValue)
    this.setData({ parsedHand: parsed })
  },

  clearInput() {
    this.setData({
      inputValue: '',
      parsedHand: { cards: [], amount: 0, handName: '' }
    })
  },

  saveHand() {
    const { parsedHand, inputValue } = this.data
    
    if (parsedHand.cards.length === 0) {
      wx.showToast({ title: '请输入手牌', icon: 'none' })
      return
    }

    // 构建保存数据
    const handData = {
      id: Date.now(),
      rawInput: inputValue,
      cards: parsedHand.cards,
      handName: parsedHand.handName,
      amount: parsedHand.amount,
      suited: parsedHand.suited,
      ev: null,
      position: '',
      action: '',
      note: '',
      timestamp: Date.now(),
      reviewed: false
    }

    // 保存到本地
    const hands = wx.getStorageSync('pokerHands') || []
    hands.unshift(handData)
    wx.setStorageSync('pokerHands', hands)

    wx.showToast({
      title: '记录成功',
      icon: 'success'
    })

    this.clearInput()
    this.loadTodayStats()
  },

  onConfirm() {
    this.saveHand()
  }
})