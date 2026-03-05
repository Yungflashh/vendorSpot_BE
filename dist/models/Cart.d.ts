import mongoose, { Document } from 'mongoose';
interface ICartItem {
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    variant?: string;
}
interface ICart extends Document {
    user: mongoose.Types.ObjectId;
    items: ICartItem[];
    couponCode?: string;
    discount: number;
    subtotal: number;
    total: number;
}
declare const Cart: mongoose.Model<ICart, {}, {}, {}, mongoose.Document<unknown, {}, ICart, {}, {}> & ICart & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Cart;
//# sourceMappingURL=Cart.d.ts.map