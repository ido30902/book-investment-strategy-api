const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;

// Middleware
app.use(bodyParser.json());

app.use(
	cors({
		origin: '*',
	})
);

// MongoDB Connection
mongoose
	.connect(DB_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('MongoDB connected successfully'))
	.catch((err) => console.error('MongoDB connection error:', err));

// Define Stock Schema based on the new structure
const stockSchema = new mongoose.Schema({
	symbol: { type: String, required: true, unique: true },
	price: { type: Number, default: 0 },
	pe: { type: Number, default: 0 },
	marketCap: { type: Number, default: 0 },
	name: { type: String, required: true },
	description: { type: String, default: '' },
	logo_url: { type: String, default: '' },
	sector: { type: String, default: '' },
	graham_props: {
		graham_score: { type: Number, default: 0 },
		current_ratio: { type: Number, default: 0 },
		debt_to_equity: { type: Number, default: 0 },
		book_value: { type: Number, default: 0 },
		graham_rank: { type: Number, default: 0 },
		eps: { type: Number, default: 0 },
		intrinsic_value: { type: Number, default: 0 }
	},
	magic_formula_props: {
		roa: { type: Number, default: 0 },
		magic_formula_rank: { type: Number, default: 0 },
	},
});

// Create model
const Stock = mongoose.model('Stock', stockSchema, 'stocks');

// Routes

// Get all stocks
app.get('/api/stocks', async (req, res) => {
	try {
		const stocks = await Stock.find();

		res.json({
			success: true,
			count: stocks.length,
			data: stocks,
		});
	} catch (error) {
		console.error('Error fetching all stocks:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

//Get stocks with limit
app.get('/api/stocks/limit/:limit', async (req, res) => {
	const limit = parseInt(req.params.limit) || 500;

	const stocks = await Stock.find().limit(limit);
	res.json({ success: true, count: stocks.length, data: stocks });
});

// Get top 50 stocks by magic_formula_rank
app.get('/api/stocks/top-magic-formula', async (req, res) => {
	const limit = parseInt(req.query.limit) || 500;

	try {
		const stocks = await Stock.find()
			.sort({ 'magic_formula_props.magic_formula_rank': 1 }) // 1 is the best rank
			.limit(limit);

		res.json({ success: true, count: stocks.length, data: stocks });
	} catch (error) {
		console.error('Error fetching top stocks:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Get top stocks by graham_rank
app.get('/api/stocks/top-graham', async (req, res) => {
	const limit = parseInt(req.query.limit) || 500;

	try {
		const stocks = await Stock.find()
			.sort({ 'graham_props.graham_rank': 1 }) // 1 is the best rank
			.limit(limit);

		res.json({ success: true, count: stocks.length, data: stocks });
	} catch (error) {
		console.error('Error fetching top stocks:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Get a specific stock by symbol
app.get('/api/stocks/:symbol', async (req, res) => {
	try {
		const stock = await Stock.findOne({
			symbol: req.params.symbol.toUpperCase(),
		});

		if (!stock) {
			return res
				.status(404)
				.json({ success: false, error: 'Stock not found' });
		}

		res.json({ success: true, data: stock });
	} catch (error) {
		console.error('Error fetching stock:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Add a new stock
app.post('/api/stocks', async (req, res) => {
	try {
		// Check if stock already exists
		const stockExists = await Stock.findOne({ symbol: req.body.symbol });
		if (stockExists) {
			return res
				.status(400)
				.json({ success: false, error: 'Stock already exists' });
		}

		// Create new stock
		const newStock = new Stock(req.body);
		await newStock.save();

		res.status(201).json({ success: true, data: newStock });
	} catch (error) {
		console.error('Error adding stock:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Update a stock
app.put('/api/stocks/:symbol', async (req, res) => {
	try {
		const updatedStock = await Stock.findOneAndUpdate(
			{ symbol: req.params.symbol.toUpperCase() },
			req.body,
			{ new: true, runValidators: true }
		);

		if (!updatedStock) {
			return res
				.status(404)
				.json({ success: false, error: 'Stock not found' });
		}

		res.json({ success: true, data: updatedStock });
	} catch (error) {
		console.error('Error updating stock:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Delete a stock
app.delete('/api/stocks/:symbol', async (req, res) => {
	try {
		const deletedStock = await Stock.findOneAndDelete({
			symbol: req.params.symbol.toUpperCase(),
		});

		if (!deletedStock) {
			return res
				.status(404)
				.json({ success: false, error: 'Stock not found' });
		}

		res.json({ success: true, data: {} });
	} catch (error) {
		console.error('Error deleting stock:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Search stocks by name or symbol
app.post('/api/stocks/search', async (req, res) => {
	try {
		const { query } = req.body;

		if (!query) {
			return res
				.status(400)
				.json({ success: false, error: 'Search query is required' });
		}

		const stocks = await Stock.find({
			$or: [
				{ symbol: { $regex: query, $options: 'i' } },
				{ name: { $regex: query, $options: 'i' } },
			],
		}).limit(20);

		res.json({ success: true, count: stocks.length, data: stocks });
	} catch (error) {
		console.error('Error searching stocks:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Filter stocks by sector
app.get('/api/stocks/sector/:sectorName', async (req, res) => {
	try {
		const stocks = await Stock.find({
			sector: { $regex: req.params.sectorName, $options: 'i' },
		});

		res.json({ success: true, count: stocks.length, data: stocks });
	} catch (error) {
		console.error('Error fetching stocks by sector:', error);
		res.status(500).json({ success: false, error: 'Server error' });
	}
});

// Start server
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes
