const blockchain = requireFrom('core/blockchainManager').getInstance()
const config = requireFrom('core/config')
const db = requireFrom('core/dbinterface').getInstance()
const arkjs = require('arkjs')
const helpers = require('../helpers')

class WalletsController {
  index (req, res, next) {
    db.accounts
      .all(req.query)
      .then(result => helpers.toCollection(result.rows, 'account'))
      .then(accounts => helpers.respondWith('ok', {accounts}))
  }

  show (req, res, next) {
    db.accounts
      .findById(req.query.address)
      .then(accounts => {
        if (!accounts) return helpers.respondWith('error', 'Not found')

        helpers.respondWith('ok', {
          account: helpers.toResource(accounts, 'account')
        })
      })
  }

  balance (req, res, next) {
    db.accounts
      .findById(req.query.address)
      .then(account => {
        if (!account) return helpers.respondWith('error', 'Not found')

        helpers.respondWith('ok', {
          balance: account ? account.balance : '0',
          unconfirmedBalance: account ? account.balance : '0'
        })
      })
  }

  publicKey (req, res, next) {
    db.accounts
      .findById(req.query.address)
      .then(account => {
        if (!account) return helpers.respondWith('error', 'Not found')

        helpers.respondWith('ok', { publicKey: account.publicKey })
      })
  }

  fee (req, res, next) {
    helpers.respondWith('ok', {
      fee: config.getConstants(blockchain.status.lastBlock.data.height).fees.delegate
    })
  }

  delegates (req, res, next) {
    db.accounts.findById(req.query.address).then(account => {
      if (!account) return helpers.respondWith('error', 'Address not found.')
      if (!account.vote) return helpers.respondWith('error', `Address ${req.query.address} hasn't voted yet.`)

      const lastBlock = blockchain.status.lastBlock.data
      const constants = config.getConstants(lastBlock.height)
      const totalSupply = config.genesisBlock.totalAmount + (lastBlock.height - constants.height) * constants.reward

      db.getActiveDelegates(lastBlock.height).then(delegates => {
          const delegateRank = delegates.findIndex(d => d.publicKey === account.vote)
          const delegate = delegates[delegateRank]

          db.accounts.findById(arkjs.crypto.getAddress(account.vote, config.network.pubKeyHash)).then(account => {
            helpers.respondWith('ok', {
              delegates: [{
                username: account.username,
                address: account.address,
                publicKey: account.publicKey,
                vote: delegate.balance + '',
                producedblocks: account.producedBlocks,
                missedblocks: 0, // TODO how?
                rate: delegateRank + 1,
                approval: ((delegate.balance / totalSupply) * 100).toFixed(2),
                productivity: (100 - (account.missedBlocks / ((account.producedBlocks + account.missedBlocks) / 100))).toFixed(2)
              }]
            })
          })
        })
      })
  }

  top (req, res, next) {
    db.accounts
      .top(req.query)
      .then(result => helpers.respondWith('ok', { accounts: result.rows }))
  }

  count (req, res, next) {
    db.accounts
      .all()
      .then(result => helpers.respondWith('ok', { count: result.count }))
  }
}

module.exports = new WalletsController()