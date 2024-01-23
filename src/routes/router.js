import {productsRouter} from '../controllers/products.controller.js'
import homeRouter from '../controllers/home.controller.js';
import {cartRouter} from '../controllers/cart.controller.js';
import editProductsRouter from '../controllers/editProducts.controller.js';
import sessionRouter from './api/sessions.js';
import profileRouter from '../controllers/profile.controller.js';
import chatRouter from '../controllers/chat.controller.js';


const routerGral = (app) => {
    app.use('/products', productsRouter);
    app.use('/', homeRouter);
    app.use('/api/carts', cartRouter);
    app.use('/realtimeproducts', editProductsRouter);
    app.use('/api/sessions', sessionRouter);
    app.use('/profile', profileRouter);
    app.use('/chatUsers', chatRouter)

}

export default routerGral;