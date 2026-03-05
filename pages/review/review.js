// pages/review/review.js
Page({
  data: {
    selectedDate: '',
    displayDate: '今天',
    hands: [],
    sortBy: 'time',
    sortOrder: 'desc',
    totalAmount: 0,
    totalEV: 0,
    diff: 0
  },

  onLoad() {
    // 默认显示今天
    const today = new Date()
    this.setData({
      selectedDate: this.formatDate(today)
    })
    this.loadHands()
  },

  onShow() {
    this.loadHands()
  },

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  loadHands() {
    const allHands = wx.getStorageSync('pokerHands') || []
    const selectedDate = this.data.selectedDate
    
    // 筛选选中日期的手牌
    let filtered = allHands.filter(h => {
      const handDate = this.formatDate(new Date(h.timestamp))
      return handDate === selectedDate
    })
    
    // 排序
    filtered = this.sortHands(filtered)
    
    // 计算统计
    const totalAmount = filtered.reduce((sum, h) => sum + (h.amount || 0), 0)
    const totalEV = filtered.reduce((sum, h) => sum + (h.ev || 0), 0)
    const diff = totalAmount - totalEV
    
    // 设置显示日期
    const today = this.formatDate(new Date())
    const yesterday = this.formatDate(new Date(Date.now() - 86400000))
    let displayDate = selectedDate
    if (selectedDate === today) displayDate = '今天'
    else if (selectedDate === yesterday) displayDate = '昨天'
    
    this.setData({
      hands: filtered,
      displayDate,
      totalAmount,
      totalEV,
      diff
    })
  },

  sortHands(hands) {
    const { sortBy, sortOrder } = this.data
    
    return hands.sort((a, b) => {
      let valA, valB
      
      switch(sortBy) {
        case 'amount':
          valA = a.amount || 0
          valB = b.amount || 0
          break
        case 'ev':
          valA = a.ev || 0
          valB = b.ev || 0
          break
        case 'time':
        default:
          valA = a.timestamp
          valB = b.timestamp
          break
      }
      
      if (sortOrder === 'desc') {
        return valB - valA
      }
      return valA - valB
    })
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value
    })
    this.loadHands()
  },

  sortBy(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ sortBy: field })
    this.loadHands()
  },

  toggleOrder() {
    const newOrder = this.data.sortOrder === 'desc' ? 'asc' : 'desc'
    this.setData({ sortOrder: newOrder })
    this.loadHands()
  },

  viewHandDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/hand-detail/hand-detail?id=${id}`
    })
  },

  goToRecord() {
    wx.switchTab({
      url: '/pages/record/record'
    })
  }
})