const InventoryItem = require('../../model/inventory/inventoryItem.model');
const Purchase = require('../../model/inventory/purchase.model');
const Sale = require('../../model/inventory/sale.model');
const mongoose = require('mongoose');

// Get Inventory Dashboard Stats
exports.getInventoryDashboard = async (req, res) => {
  try {
    const schoolId = req.params?.schoolId || req.user?.schoolId || req.user?.school || null;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid school ID format'
      });
    }

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Last week date range
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Current month date range
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Last 6 months
    const last6MonthsStart = new Date(today);
    last6MonthsStart.setMonth(last6MonthsStart.getMonth() - 6);

    // Current session (academic year)
    const currentYear = today.getFullYear();
    const sessionStart = new Date(currentYear, 3, 1); // April 1st

    // Customer Balance (for students/staff with credit purchases)
    const customerBalance = await Sale.aggregate([
      {
        $match: {
          school: schoolObjectId,
          balanceAmount: { $gt: 0 },
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balanceAmount' }
        }
      }
    ]);

    // Supplier Balance
    const supplierBalance = await Purchase.aggregate([
      {
        $match: {
          school: schoolObjectId,
          balanceAmount: { $gt: 0 },
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balanceAmount' }
        }
      }
    ]);

    // Stock Value (total value of all items in stock)
    const stockValue = await InventoryItem.aggregate([
      {
        $match: {
          school: schoolObjectId,
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalValue' }
        }
      }
    ]);

    // Active Items Count
    const activeItems = await InventoryItem.countDocuments({
      school: schoolId,
      isActive: true
    });

    // Sell Amount Calculations
    const sellAmounts = await Sale.aggregate([
      {
        $match: {
          school: schoolObjectId,
          isActive: true
        }
      },
      {
        $facet: {
          todaySell: [
            {
              $match: {
                saleDate: { $gte: today, $lt: tomorrow }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          lastWeekSell: [
            {
              $match: {
                saleDate: { $gte: lastWeekStart, $lt: today }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          currentMonthSell: [
            {
              $match: {
                saleDate: { $gte: currentMonthStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          last6MonthsSell: [
            {
              $match: {
                saleDate: { $gte: last6MonthsStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          currentSessionSell: [
            {
              $match: {
                saleDate: { $gte: sessionStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ]
        }
      }
    ]);

    // Received Amount Calculations (payments received from sales)
    const receivedAmounts = await Sale.aggregate([
      {
        $match: {
          school: schoolObjectId,
          isActive: true
        }
      },
      {
        $facet: {
          todayReceived: [
            {
              $match: {
                saleDate: { $gte: today, $lt: tomorrow }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$receivedAmount' }
              }
            }
          ],
          lastWeekReceived: [
            {
              $match: {
                saleDate: { $gte: lastWeekStart, $lt: today }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$receivedAmount' }
              }
            }
          ],
          currentMonthReceived: [
            {
              $match: {
                saleDate: { $gte: currentMonthStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$receivedAmount' }
              }
            }
          ],
          last6MonthsReceived: [
            {
              $match: {
                saleDate: { $gte: last6MonthsStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$receivedAmount' }
              }
            }
          ],
          currentSessionReceived: [
            {
              $match: {
                saleDate: { $gte: sessionStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$receivedAmount' }
              }
            }
          ]
        }
      }
    ]);

    // Purchase Amount Calculations
    const purchaseAmounts = await Purchase.aggregate([
      {
        $match: {
          school: schoolObjectId,
          isActive: true
        }
      },
      {
        $facet: {
          todayPurchase: [
            {
              $match: {
                purchaseDate: { $gte: today, $lt: tomorrow }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          lastWeekPurchase: [
            {
              $match: {
                purchaseDate: { $gte: lastWeekStart, $lt: today }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          currentMonthPurchase: [
            {
              $match: {
                purchaseDate: { $gte: currentMonthStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          last6MonthsPurchase: [
            {
              $match: {
                purchaseDate: { $gte: last6MonthsStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ],
          currentSessionPurchase: [
            {
              $match: {
                purchaseDate: { $gte: sessionStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' }
              }
            }
          ]
        }
      }
    ]);

    const sellData = sellAmounts[0];
    const receivedData = receivedAmounts[0];
    const purchaseData = purchaseAmounts[0];

    res.status(200).json({
      success: true,
      data: {
        // Top Stats
        customerBalance: customerBalance[0]?.total || 0,
        stockValue: stockValue[0]?.total || 0,
        supplierBalance: supplierBalance[0]?.total || 0,
        activeItems,

        // Sell Amounts
        sellAmount: {
          today: sellData.todaySell[0]?.total || 0,
          lastWeek: sellData.lastWeekSell[0]?.total || 0,
          currentMonth: sellData.currentMonthSell[0]?.total || 0,
          last6Months: sellData.last6MonthsSell[0]?.total || 0,
          currentSession: sellData.currentSessionSell[0]?.total || 0
        },

        // Received Amounts
        receivedAmount: {
          today: receivedData.todayReceived[0]?.total || 0,
          lastWeek: receivedData.lastWeekReceived[0]?.total || 0,
          currentMonth: receivedData.currentMonthReceived[0]?.total || 0,
          last6Months: receivedData.last6MonthsReceived[0]?.total || 0,
          currentSession: receivedData.currentSessionReceived[0]?.total || 0
        },

        // Purchase Amounts
        purchaseAmount: {
          today: purchaseData.todayPurchase[0]?.total || 0,
          lastWeek: purchaseData.lastWeekPurchase[0]?.total || 0,
          currentMonth: purchaseData.currentMonthPurchase[0]?.total || 0,
          last6Months: purchaseData.last6MonthsPurchase[0]?.total || 0,
          currentSession: purchaseData.currentSessionPurchase[0]?.total || 0
        },

        // UI Configuration (Database-driven)
        uiConfig: {
          amountSections: [
            {
              title: 'Sell Amount',
              icon: 'TrendingUpIcon',
              color: '#f59e0b',
              gradient: ['#fbbf24', '#f97316'],
              key: 'sellAmount',
              rows: [
                { label: "Today's Sell", key: 'today' },
                { label: 'Last Week Sell', key: 'lastWeek' },
                { label: 'Current Month Sell', key: 'currentMonth' },
                { label: 'Last 6 Month Sell', key: 'last6Months' },
                { label: 'Current Session Sell', key: 'currentSession' }
              ]
            },
            {
              title: 'Received Amount',
              icon: 'MoneyIcon',
              color: '#10b981',
              gradient: ['#34d399', '#059669'],
              key: 'receivedAmount',
              rows: [
                { label: "Today's Received", key: 'today' },
                { label: 'Last Week Received', key: 'lastWeek' },
                { label: 'Current Month Received', key: 'currentMonth' },
                { label: 'Last 6 Month Received', key: 'last6Months' },
                { label: 'Current Session Received', key: 'currentSession' }
              ]
            },
            {
              title: 'Purchased Amount',
              icon: 'CartIcon',
              color: '#ef4444',
              gradient: ['#fb7185', '#e11d48'],
              key: 'purchaseAmount',
              rows: [
                { label: "Today's Purchase", key: 'today' },
                { label: 'Last Week Purchase', key: 'lastWeek' },
                { label: 'Current Month Purchase', key: 'currentMonth' },
                { label: 'Last 6 Month Purchase', key: 'last6Months' },
                { label: 'Current Session Purchase', key: 'currentSession' }
              ]
            }
          ],
          quickActions: [
            { label: 'New Sale', icon: 'AddIcon', color: '#10b981', route: '/school/inventory/sale' },
            { label: 'New Purchase', icon: 'AddIcon', color: '#ef4444', route: '/school/inventory/purchase' },
            { label: 'Sell Report', icon: 'DownloadIcon', color: '#f59e0b', route: '/school/inventory/reports/sales' },
            { label: 'Purchase Report', icon: 'DownloadIcon', color: '#8b5cf6', route: '/school/inventory/reports/purchases' },
            { label: 'Stock Report', icon: 'DownloadIcon', color: '#3b82f6', route: '/school/inventory/reports/stock' },
            { label: 'All Items', icon: 'InventoryIcon', color: '#0ea5e9', route: '/school/inventory/items' }
          ]
        }
      }
    });

  } catch (error) {
    console.error('Error in getInventoryDashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory dashboard',
      error: error.message
    });
  }
};

// Get Low Stock Items
exports.getLowStockItems = async (req, res) => {
  try {
    const schoolId = req.params?.schoolId || req.user?.schoolId || req.user?.school || null;
    const { limit = 10 } = req.query;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School ID is required' });
    }

    const lowStockItems = await InventoryItem.find({
      school: schoolId,
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    })
    .sort({ currentStock: 1 })
    .limit(parseInt(limit))
    .select('itemName itemCode currentStock minStockLevel category unit');

    res.status(200).json({
      success: true,
      data: lowStockItems
    });

  } catch (error) {
    console.error('Error in getLowStockItems:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock items',
      error: error.message
    });
  }
};

// Get Recent Transactions
exports.getRecentTransactions = async (req, res) => {
  try {
    const schoolId = req.params?.schoolId || req.user?.schoolId || req.user?.school || null;
    const { type = 'all', limit = 10 } = req.query;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School ID is required' });
    }

    let transactions = [];

    if (type === 'sale' || type === 'all') {
      const sales = await Sale.find({
        school: schoolId,
        isActive: true
      })
      .sort({ saleDate: -1 })
      .limit(parseInt(limit))
      .select('saleNo saleDate customer.name totalAmount receivedAmount paymentStatus')
      .lean();

      transactions = [...transactions, ...sales.map(s => ({
        ...s,
        type: 'Sale',
        date: s.saleDate,
        party: s.customer.name
      }))];
    }

    if (type === 'purchase' || type === 'all') {
      const purchases = await Purchase.find({
        school: schoolId,
        isActive: true
      })
      .sort({ purchaseDate: -1 })
      .limit(parseInt(limit))
      .select('purchaseNo purchaseDate supplier.name totalAmount paidAmount paymentStatus')
      .lean();

      transactions = [...transactions, ...purchases.map(p => ({
        ...p,
        type: 'Purchase',
        date: p.purchaseDate,
        party: p.supplier.name
      }))];
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    transactions = transactions.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: transactions
    });

  } catch (error) {
    console.error('Error in getRecentTransactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent transactions',
      error: error.message
    });
  }
};

module.exports = exports;
