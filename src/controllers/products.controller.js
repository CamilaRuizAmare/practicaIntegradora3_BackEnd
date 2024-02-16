import express from 'express';
import productManager from '../dao/mongo/db/ProductManager.dao.js';
import productModel from '../dao/mongo/models/products.model.js';
import { uploader, passportCall, authorizationUser } from '../utils.js';
import errorCustom from '../utils/custom.error.js';
import generateProductCreateError from '../utils/info.error.js';
import infoErrors from '../utils/enum.error.js'

const productsRouter = express.Router();

productsRouter.get('/', passportCall('jwt'), authorizationUser('user', 'Premium'), async (req, res) => {
    try {
        const query = req.query;
        const filter = {};
        for (let q in query) {
            if (q !== 'limit' && q !== 'page' && q !== 'sort') {
                filter[q] = query[q];
            }
        }

        const option = {
            limit: query?.limit || 10,
            page: query?.page || 1,
            sort: { price: parseInt(query?.sort) || 1 },
            lean: true,
        }
        const products = await productModel.paginate(filter, option);
        products.prevLink = products.hasPrevPage ? `http://localhost:8080/products/?page=${products.prevPage}` : '';
        products.nextLink = products.hasNextPage ? `http://localhost:8080/products/?page=${products.nextPage}` : '';
        return res.status(200).render("index", {
            layout: 'products',
            title: 'All Products',
            products,
            query,
            dataUser: req.user.user,
        });

    }
    catch (err) {
        req.logger.ERROR(err);
        res.status(500).json({ "Internal Server Error": err.message });
    }

});

productsRouter.get('/:pid', async (req, res) => {
    try {
        const productID = req.params.pid;
        const productByID = await productManager.getProductById(productID);
        if (!productByID) {
            req.logger.WARNING('Product by ID not found')
            res.status(404).json({ message: "Product not found" });
        };
        res.status(200).json(productByID);
    }
    catch (err) {
        req.logger.ERROR(err);
        res.status(500).json({ "Internal Server Error": err.message });
    }
});

productsRouter.post('/', uploader.array('files'), passportCall('jwt'), async (req, res) => {
    try {
        const newProduct = {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            stock: req.body.stock,
            code: req.body.code,
            thumbnail: req.files,
            category: req.body.category,
            owner: req.user.user.email || 'Admin'
        };
        req.logger.DEBUG(newProduct.title, newProduct.description, newProduct.price);
        req.logger.DEBUG(req.user.user.email);
        const productValidation = newProduct.title != '' && newProduct.description != '' && newProduct.price != '' && newProduct.code != '' && newProduct.stock != ''
        const codeValidation = await productModel.findOne({ code: newProduct.code })
        req.logger.DEBUG(codeValidation)
        if (productValidation && !codeValidation) {
            await productManager.addProduct(newProduct);
            return res.status(201).redirect('/realtimeproducts');
        }
        if (codeValidation) {
            req.logger.WARNING('Product has already been entered')
            return res.status(409).json(`The product with code ${newProduct.code} has already been entered`)
        };
        if (!productValidation) {
            const error = errorCustom.newError({
                name: 'Product creation error',
                cause: generateProductCreateError({ title: newProduct.title, description: newProduct.description, price: newProduct.price, code: newProduct.code, stock: newProduct.stock }),
                message: 'Error creating product',
                code: infoErrors.productCreateError
            })
            req.logger.ERROR('Product creation error', error)
            return res.status(401).json(error)
        };

    }
    catch (err) {
        req.logger.ERROR(err);
        res.status(500).json(err);
    }
});

productsRouter.put('/:pid', uploader.array('files'), async (req, res) => {
    try {
        const productID = req.params.pid;
        const productByID = await productManager.updateProduct(productID);
        if (!productByID) {
            req.logger.WARNING('Product by ID not found')
            res.status(404).json({ message: "Product not found" });
        } else {
            res.status(201).json(productByID);
        };
    }
    catch (err) {
        req.logger.ERROR(err);
        res.status(500).json({ "Internal Server Error": err.message });
    };
});

productsRouter.delete('/:pid', passportCall('jwt'), async (req, res) => {
    try {
        const user = req.user.user;
        const productID = req.params.pid;
        const productToDelete = await productManager.getProductById(productID);
        const validationOwner = productToDelete.owner === user.email
        req.logger.DEBUG(validationOwner)
        req.logger.DEBUG(productID);
        if (!productToDelete) {
            req.logger.WARNING('Product by ID not found')
            return res.status(404).json({ message: "Product not found" });
        };
        if(validationOwner === false && user.role != 'Admin') {
            req.logger.ERROR('User without permissions to delete this product')
            return res.status(403).json({'Error': 'User without permissions to delete this product'})
        }
        const productByID = await productManager.deleteProduct(productID);
        req.logger.DEBUG(productByID)
        return res.status(200).json({ "Deleted product:": productByID });
    }
    catch (err) {
        req.logger.ERROR(err);
        res.status(500).json({ "Internal Server Error": err.message });
    }
});

export { productsRouter };
