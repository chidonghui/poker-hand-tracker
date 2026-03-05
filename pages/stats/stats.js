// pages/stats/stats.js
Page({
  data: {
    timeRange: 'day',
    stats: {
      totalHands: 0,
      totalProfit: 0,
      totalEV: 0,
      evDiff: 0
    },
    topWinners: [],
    topLosers: [],
    positionStats: []
  },

  onLoad() {
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  setRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    this.loadStats()
  },

  loadStats() {
    const hands = wx.getStorageSync('pokerHands') || []
    const { timeRange } = this.data
    
    // 根据时间范围筛选
    const now = new Date()
    let filtered = hands
    
    if (timeRange === 'day') {
      const today = now.toDateString()
      filtered = hands.filter(h => new Date(h.timestamp).toDateString() === today)
    } else if (timeRange === 'week') {
      const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
      filtered = hands.filter(h => h.timestamp > weekAgo)
    } else if (timeRange === 'month') {
      const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000
      filtered = hands.filter(h => h.timestamp > monthAgo)
    }
    
    // 计算统计数据
    const totalHands = filtered.length
    const totalProfit = filtered.reduce((sum, h) => sum + (h.amount || 0), 0)
    const totalEV = filtered.reduce((sum, h) => sum + (h.ev || 0), 0)
    const evDiff = totalProfit - totalEV
    
    // 盈利 TOP5
    const winners = [...filtered]
      .filter(h => h.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    
    // 亏损 TOP5
    const losers = [...filtered]
      .filter(h => h.amount < 0)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 5)
    
    // 位置统计
    const posMap = {}
    filtered.forEach(h => {
      if (h.position) {
        if (!posMap[h.position]) {
          posMap[h.position] = { position: h.position, hands: 0, profit: 0 }
        }
        posMap[h.position].hands++
        posMap[h.position].profit += h.amount || 0
      }
    })
    const positionStats = Object.values(posMap).sort((a, b) => b.profit - a.profit)
    
    this.setData({
      stats: { totalHands, totalProfit, totalEV, evDiff },
      topWinners: winners,
      topLosers: losers,
      positionStats
    })
  }
})