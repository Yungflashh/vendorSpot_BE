import { Response } from 'express';
import { AuthRequest, ApiResponse, ProductStatus } from '../types';
import Product from '../models/Product';
import Category from '../models/Category';
import { AppError } from '../middleware/error';
import { getPaginationMeta, generateSlug, generateSKU } from '../utils/helpers';

export class ProductController {
  async createProduct(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const productData = req.body;
    
    productData.vendor = req.user?.id;
    productData.slug = generateSlug(productData.name);
    if (!productData.sku) {
      productData.sku = generateSKU(productData.name);
    }

    const product = await Product.create(productData);

    await Category.findByIdAndUpdate(product.category, {
      $inc: { productCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  }

  async getProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { status: ProductStatus.ACTIVE };
    
    // Filters
    if (req.query.category) filter.category = req.query.category;
    if (req.query.vendor) filter.vendor = req.query.vendor;
    if (req.query.productType) filter.productType = req.query.productType;
    if (req.query.inStock !== undefined) {
      filter.quantity = req.query.inStock === 'true' ? { $gt: 0 } : 0;
    }
    
    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }
    
    // Rating
    if (req.query.rating) {
      filter.averageRating = { $gte: Number(req.query.rating) };
    }
    
    // Search
    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    // Sort
    let sort: any = { createdAt: -1 };
    switch (req.query.sort) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { averageRating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { totalSales: -1, views: -1 };
        break;
    }

    const products = await Product.find(filter)
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(filter);
    const meta = getPaginationMeta(total, page, limit);

    // Format products for frontend
    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Products fetched successfully',
      data: { 
        products: formattedProducts,
        total,
        page,
        limit,
        hasMore: skip + products.length < total
      },
      meta,
    });
  }

  async getProduct(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'firstName lastName email profileImage')
      .populate('category', 'name');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json({
      success: true,
      message: 'Product fetched successfully',
      data: this.formatProduct(product),
    });
  }

  // NEW: Get Recommended Products
  async getRecommendedProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get user's browsing history, preferences, etc.
    // For now, return top-rated in-stock products
    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      quantity: { $gt: 0 }
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ averageRating: -1, totalSales: -1, views: -1 })
      .limit(limit)
      .lean();

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Recommended products fetched successfully',
      data: {
        products: formattedProducts,
        total: products.length,
        page: 1,
        limit,
        hasMore: false
      }
    });
  }

  // NEW: Get Featured Products
  async getFeaturedProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;

    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      quantity: { $gt: 0 }
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Featured products fetched successfully',
      data: {
        products: formattedProducts,
        total: products.length,
        page: 1,
        limit,
        hasMore: false
      }
    });
  }

  // NEW: Get Products by Category
  async getProductsByCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      category: categoryId
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments({ 
      status: ProductStatus.ACTIVE,
      category: categoryId 
    });

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Category products fetched successfully',
      data: {
        products: formattedProducts,
        total,
        page,
        limit,
        hasMore: skip + products.length < total
      }
    });
  }

  // NEW: Search Products
  async searchProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    if (!query) {
      throw new AppError('Search query is required', 400);
    }

    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      $text: { $search: query }
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments({ 
      status: ProductStatus.ACTIVE,
      $text: { $search: query }
    });

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Search results fetched successfully',
      data: {
        products: formattedProducts,
        total,
        page,
        limit,
        hasMore: skip + products.length < total,
        query
      }
    });
  }

  // NEW: Get New Arrivals
  async getNewArrivals(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Products created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      createdAt: { $gte: thirtyDaysAgo },
      quantity: { $gt: 0 }
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'New arrivals fetched successfully',
      data: {
        products: formattedProducts,
        total: products.length,
        page: 1,
        limit,
        hasMore: false
      }
    });
  }

  // NEW: Get Products On Sale
  async getProductsOnSale(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;

    // Products with compareAtPrice set (indicating discount)
    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      compareAtPrice: { $exists: true, $gt: 0 },
      $expr: { $lt: ['$price', '$compareAtPrice'] },
      quantity: { $gt: 0 }
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Sale products fetched successfully',
      data: {
        products: formattedProducts,
        total: products.length,
        page: 1,
        limit,
        hasMore: false
      }
    });
  }

  // NEW: Get Vendor Products
  async getVendorProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { vendorId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      vendor: vendorId
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments({ 
      status: ProductStatus.ACTIVE,
      vendor: vendorId 
    });

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Vendor products fetched successfully',
      data: {
        products: formattedProducts,
        total,
        page,
        limit,
        hasMore: skip + products.length < total
      }
    });
  }

  // NEW: Get Trending Products
  async getTrendingProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;

    // Trending = high sales + views in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const products = await Product.find({ 
      status: ProductStatus.ACTIVE,
      quantity: { $gt: 0 },
      updatedAt: { $gte: sevenDaysAgo }
    })
      .populate('vendor', 'firstName lastName profileImage')
      .populate('category', 'name')
      .sort({ totalSales: -1, views: -1, averageRating: -1 })
      .limit(limit)
      .lean();

    const formattedProducts = products.map(this.formatProduct);

    res.json({
      success: true,
      message: 'Trending products fetched successfully',
      data: {
        products: formattedProducts,
        total: products.length,
        page: 1,
        limit,
        hasMore: false
      }
    });
  }

  async updateProduct(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.vendor.toString() !== req.user?.id) {
      throw new AppError('Not authorized', 403);
    }

    Object.assign(product, req.body);
    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  }

  async deleteProduct(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.vendor.toString() !== req.user?.id) {
      throw new AppError('Not authorized', 403);
    }

    await product.deleteOne();

    await Category.findByIdAndUpdate(product.category, {
      $inc: { productCount: -1 },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  }

  // Add this to your ProductController class

  // Updated Helper method to format product for frontend
  private formatProduct(product: any): any {
    // Calculate discount percentage
    let discountPercentage = null;
    if (product.compareAtPrice && product.compareAtPrice > product.price) {
      const discount = Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
      discountPercentage = `-${discount}%`;
    }

    // Convert specifications Map to object if it exists
    let specifications = {};
    if (product.specifications) {
      if (product.specifications instanceof Map) {
        specifications = Object.fromEntries(product.specifications);
      } else {
        specifications = product.specifications;
      }
    }

    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      originalPrice: product.compareAtPrice,
      discount: product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0,
      discountPercentage,
      rating: product.averageRating || 0,
      reviews: product.totalReviews || 0,
      images: product.images || [],
      thumbnail: product.images?.[0] || '',
      category: product.category?.name || 'Uncategorized',
      categoryId: product.category?._id?.toString() || '',
      vendor: {
        id: product.vendor?._id?.toString() || '',
        name: product.vendor ? `${product.vendor.firstName} ${product.vendor.lastName}` : 'Unknown',
        image: product.vendor?.profileImage || ''
      },
      stock: product.quantity || 0,
      inStock: (product.quantity || 0) > 0,
      tags: product.tags || [],
      productType: product.productType,
      isFeatured: product.isFeatured || false,
      isAffiliate: product.isAffiliate || false,
      affiliateCommission: product.affiliateCommission || 0,
      totalSales: product.totalSales || 0,
      views: product.views || 0,
      weight: product.weight,
      // NEW: Product details
      keyFeatures: product.keyFeatures || [],
      specifications: specifications,
      requiresLicense: product.requiresLicense || false,
      licenseType: product.licenseType,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }
}

export const productController = new ProductController();