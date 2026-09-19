const fs = require('fs')
const path = 'src/pages/orders/OrdersPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

function replaceBlock(oldLines, newLines, label) {
  const oldStr = oldLines.join('\r\n')
  const newStr = newLines.join('\r\n')
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr)
    count++
    console.log(`OK : ${label}`)
  } else {
    console.log(`ECHEC : ${label} — bloc non trouve tel quel`)
  }
}

// 1. Import — ajouter cashService
replaceBlock(
  ["import { clientsService, ordersService, generateTicketNumber } from '../../lib/db'"],
  ["import { clientsService, ordersService, generateTicketNumber, cashService } from '../../lib/db'"],
  "import cashService"
)

// 2. Enregistrement caisse à la création de commande
replaceBlock(
  [
    "    // Enregistrement automatique en caisse",
    "    const session = getCurrentSession()",
    "    if (session && depositFinal > 0) {",
    "      addCashTransaction({",
    "        id: crypto.randomUUID(),",
    "        session_id: session.id,",
    "        type: 'entree',",
    "        amount: depositFinal,",
    "        reason: `Acompte commande #${ticket} — ${client.first_name} ${client.last_name}`,",
    "        created_by: user?.full_name || 'Admin',",
    "        created_at: new Date().toISOString()",
    "      })",
    "    }",
  ],
  [
    "    // Enregistrement automatique en caisse (Supabase — connecte a la vraie caisse)",
    "    if (depositFinal > 0) {",
    "      try {",
    "        const allSessions = await cashService.getSessions()",
    "        const openSession = allSessions.find((s: any) => s.status === 'open')",
    "        if (openSession) {",
    "          await cashService.addTransaction({",
    "            id: crypto.randomUUID(),",
    "            session_id: openSession.id,",
    "            type: 'entree',",
    "            amount: depositFinal,",
    "            reason: `Acompte commande #${ticket} — ${client.first_name} ${client.last_name}`,",
    "            created_by: user?.full_name || 'Admin',",
    "            created_at: new Date().toISOString()",
    "          })",
    "        }",
    "      } catch (err) { console.error('Erreur enregistrement caisse:', err) }",
    "    }",
  ],
  "enregistrement caisse creation commande"
)

// 3. Enregistrement caisse au paiement à la livraison
replaceBlock(
  [
    "  const handlePaymentOnPickup = () => {",
  ],
  [
    "  const handlePaymentOnPickup = async () => {",
  ],
  "handlePaymentOnPickup en async"
)

replaceBlock(
  [
    "    // Enregistrement automatique en caisse",
    "    const session = getCurrentSession()",
    "    if (session && paymentAmount > 0) {",
    "      addCashTransaction({",
    "        id: crypto.randomUUID(),",
    "        session_id: session.id,",
    "        type: 'entree',",
    "        amount: paymentAmount,",
    "        reason: `Paiement livraison #${order.ticket_number} — ${order.client?.first_name} ${order.client?.last_name}`,",
    "        created_by: user?.full_name || 'Admin',",
    "        created_at: new Date().toISOString()",
    "      })",
    "    }",
  ],
  [
    "    // Enregistrement automatique en caisse (Supabase — connecte a la vraie caisse)",
    "    if (paymentAmount > 0) {",
    "      try {",
    "        const allSessions = await cashService.getSessions()",
    "        const openSession = allSessions.find((s: any) => s.status === 'open')",
    "        if (openSession) {",
    "          await cashService.addTransaction({",
    "            id: crypto.randomUUID(),",
    "            session_id: openSession.id,",
    "            type: 'entree',",
    "            amount: paymentAmount,",
    "            reason: `Paiement livraison #${order.ticket_number} — ${order.client?.first_name} ${order.client?.last_name}`,",
    "            created_by: user?.full_name || 'Admin',",
    "            created_at: new Date().toISOString()",
    "          })",
    "        }",
    "      } catch (err) { console.error('Erreur enregistrement caisse:', err) }",
    "    }",
  ],
  "enregistrement caisse paiement livraison"
)

fs.writeFileSync(path, content, 'utf8')
console.log(`\nTermine : ${count}/4 corrections appliquees`)
