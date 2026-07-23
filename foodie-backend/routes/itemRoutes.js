const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

// Clean RESTful API mappings
router.route('/')
    .get(itemController.getAllItems)      // GET /api/v1/items
    .post(itemController.createItem);     // POST /api/v1/items

router.route('/:id')
    .put(itemController.updateItem)       // PUT /api/v1/items/:id
    .delete(itemController.deleteItem);   // DELETE /api/v1/items/:id

module.exports = router;