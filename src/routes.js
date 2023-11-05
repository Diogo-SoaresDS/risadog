const express = require('express')
const routes = express.Router()
// const authMiddeware = require('./middlewares/auth')
const colaboradoresController = require('./controllers/ColoboradoresController')
const clientesController = require('./controllers/ClientesController')
const animaisController = require('./controllers/AnimaisController')
const agendasController = require('./controllers/AgendasController')

routes.post('/cadastro', colaboradoresController.create)
routes.post('/login', colaboradoresController.login)
// routes.use(authMiddeware)

// Colaboradores
routes.get('/agendas', colaboradoresController.index)
routes.post('/colaborador', colaboradoresController.filterToServices)

// Clientes
routes.post('/agendas/nova-solicitacao', clientesController.createClientAnimals)
routes.get('/agendas/nova-solicitacao', clientesController.index)
routes.get('/agendas/cliente', clientesController.buscaClient)
routes.get('/agendas/cliente/animais', clientesController.listAnimalsClient)
routes.put('/agendas/cliente/:idCliente', clientesController.update)
routes.delete('/agendas/cliente/:id', clientesController.delete)
routes.get('/agendas/nova-solicitacao/:id/animais', clientesController.listAnimals)

// Animais
routes.post('/agendas/nova-solicitacao/:id/animais', animaisController.create)
routes.put('/agendas/nova-solicitacao/animais/:id', animaisController.update)
routes.delete('/agendas/nova-solicitacao/animais/:id', animaisController.delete)
routes.get('/agendas/nova-solicitacao/animais/:id', animaisController.listAgender)

// Agendas
routes.post('/agendas', agendasController.create)
routes.get('/agendas', agendasController.index)
routes.get('/agendas/dia', agendasController.indexDay)
routes.put('/agendas/:id', agendasController.update)
routes.delete('/agendas/:id', agendasController.delete)
routes.get('/agendas/filter', agendasController.filterDataAndStatus)

// Pagamento
routes.get('/agendas/nova-solicitacao/pagamento/:id')

module.exports = routes