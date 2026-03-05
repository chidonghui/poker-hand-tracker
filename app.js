App({
  onLaunch() {
    this.initData()
  },

  initData() {
    const hands = wx.getStorageSync('pokerHands')
    if (!hands) {
      wx.setStorageSync('pokerHands', [])
    }
    
    const sessions = wx.getStorageSync('pokerSessions')
    if (!sessions) {
      wx.setStorageSync('pokerSessions', [])
    }
  },

  // 解析快速输入语法
  // 牌面大写: A, K, Q, J, T, 9-2
  // 花色小写: s=黑桃♠️, h=红心❤️, c=梅花♣️, d=方块♦️
  // As = A黑桃, Kh = K红心, AsKh = 黑桃A+红心K
  parseHandInput(input) {
    const result = {
      raw: input,
      cards: [],
      amount: 0,
      suited: null,
      suits: [],
      handName: '',
      timestamp: Date.now()
    }

    // 解析金额
    const amountMatch = input.match(/([+-])(\d+)/)
    if (amountMatch) {
      result.amount = parseInt(amountMatch[1] + amountMatch[2])
    }

    // 移除金额，解析手牌
    let handPart = input.replace(/[+-]\d+/, '').trim()

    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
    const suits = ['s', 'h', 'c', 'd']
    
    let i = 0
    let cardCount = 0
    
    while (i < handPart.length && cardCount < 2) {
      const char = handPart[i]
      
      if (ranks.includes(char.toUpperCase())) {
        const rank = char.toUpperCase()
        let suit = null
        
        if (i + 1 < handPart.length && suits.includes(handPart[i + 1])) {
          suit = handPart[i + 1]
          i += 2
        } else {
          i += 1
        }
        
        result.cards.push({
          rank: rank,
          suit: suit ? suit.toUpperCase() : null,
          suitName: this.getSuitName(suit)
        })
        cardCount++
      } else if ((char === 's' || char === 'o') && cardCount === 1) {
        const nextChar = handPart[i + 1]
        if (!nextChar || !ranks.includes(nextChar.toUpperCase())) {
          if (char === 's') result.suited = true
          if (char === 'o') result.suited = false
        }
        i += 1
      } else {
        i += 1
      }
    }

    // 判断suited/off suit
    if (result.cards.length === 2) {
      const suit1 = result.cards[0].suit
      const suit2 = result.cards[1].suit
      
      if (suit1 && suit2) {
        result.suited = (suit1 === suit2)
      }
    }

    // 生成手牌名称
    if (result.cards.length === 2) {
      const card1 = result.cards[0]
      const card2 = result.cards[1]
      
      if (card1.rank === card2.rank) {
        result.handName = card1.rank + card2.rank
      } else if (card1.suit && card2.suit) {
        result.handName = card1.rank + card1.suit.toLowerCase() + card2.rank + card2.suit.toLowerCase()
      } else if (result.suited === true) {
        result.handName = card1.rank + card2.rank + 's'
      } else if (result.suited === false) {
        result.handName = card1.rank + card2.rank + 'o'
      } else {
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
    const map = {
      's': 'spade',
      'h': 'heart',
      'c': 'club',
      'd': 'diamond'
    }
    return map[suit.toLowerCase()] || ''
  },

  formatAmount(amount) {
    if (amount >= 0) {
      return '+' + amount.toLocaleString()
    }
    return amount.toLocaleString()
  },

  globalData: {
    userInfo: null,
    primaryColor: '#e94560',
    bgColor: '#16213e',
    cardBg: '#1a1a2e'
  }
})