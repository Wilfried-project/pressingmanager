const fs = require('fs')
const path = 'src/pages/orders/OrdersPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

const pairs = [
  [
    "<Badge label={order.status.replace('_', ' ')} color={getOrderStatusColor(order.status)} />",
    "<Badge label={order.status.replace('_', ' ').replace(/^./, c => c.toUpperCase())} color={getOrderStatusColor(order.status)} />"
  ],
  [
    "<Badge label={order.priority} color={getPriorityColor(order.priority)} />",
    "<Badge label={order.priority.replace(/^./, c => c.toUpperCase())} color={getPriorityColor(order.priority)} />"
  ],
  [
    "<Badge label={cloth.status} color={getClothStatusColor(cloth.status)} />",
    "<Badge label={cloth.status.replace(/^./, c => c.toUpperCase())} color={getClothStatusColor(cloth.status)} />"
  ],
]

pairs.forEach(([oldStr, newStr]) => {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr)
    count++
  }
})

fs.writeFileSync(path, content, 'utf8')
console.log(`Termine : ${count}/3 corrections appliquees`)
