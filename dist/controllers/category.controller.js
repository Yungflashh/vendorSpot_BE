"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = exports.CategoryController = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const error_1 = require("../middleware/error");
const helpers_1 = require("../utils/helpers");
class CategoryController {
    /**
     * Create category
     */
    async createCategory(req, res) {
        const { name, description, image, icon, parent } = req.body;
        // Generate slug
        const slug = (0, helpers_1.generateSlug)(name);
        // Check if slug exists
        const existing = await Category_1.default.findOne({ slug });
        if (existing) {
            throw new error_1.AppError('Category with this name already exists', 400);
        }
        // Determine level
        let level = 0;
        if (parent) {
            const parentCategory = await Category_1.default.findById(parent);
            if (!parentCategory) {
                throw new error_1.AppError('Parent category not found', 404);
            }
            level = parentCategory.level + 1;
        }
        const category = await Category_1.default.create({
            name,
            slug,
            description,
            image,
            icon,
            parent,
            level,
        });
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { category },
        });
    }
    /**
     * Get all categories
     */
    async getCategories(req, res) {
        const { parent = null, level } = req.query;
        const filter = { isActive: true };
        if (parent !== undefined) {
            filter.parent = parent === 'null' ? null : parent;
        }
        if (level !== undefined) {
            filter.level = parseInt(level);
        }
        const categories = await Category_1.default.find(filter)
            .sort({ order: 1, name: 1 })
            .populate('parent', 'name slug');
        res.json({
            success: true,
            data: { categories },
        });
    }
    /**
     * Get category tree (hierarchical)
     */
    async getCategoryTree(req, res) {
        // Get all root categories
        const rootCategories = await Category_1.default.find({
            parent: null,
            isActive: true,
        }).sort({ order: 1, name: 1 });
        // Build tree
        const tree = await Promise.all(rootCategories.map(async (category) => {
            const subcategories = await Category_1.default.find({
                parent: category._id,
                isActive: true,
            }).sort({ order: 1, name: 1 });
            return {
                ...category.toObject(),
                subcategories,
            };
        }));
        res.json({
            success: true,
            data: { categories: tree },
        });
    }
    /**
     * Get single category
     */
    async getCategory(req, res) {
        const { slug } = req.params;
        const category = await Category_1.default.findOne({ slug, isActive: true }).populate('parent', 'name slug');
        if (!category) {
            throw new error_1.AppError('Category not found', 404);
        }
        // Get subcategories
        const subcategories = await Category_1.default.find({
            parent: category._id,
            isActive: true,
        }).sort({ order: 1, name: 1 });
        res.json({
            success: true,
            data: {
                category,
                subcategories,
            },
        });
    }
    /**
     * Update category
     */
    async updateCategory(req, res) {
        const { id } = req.params;
        const category = await Category_1.default.findById(id);
        if (!category) {
            throw new error_1.AppError('Category not found', 404);
        }
        const allowedUpdates = ['name', 'description', 'image', 'icon', 'order', 'isActive'];
        Object.keys(req.body).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                if (key === 'name') {
                    category.name = req.body[key];
                    category.slug = (0, helpers_1.generateSlug)(req.body[key]);
                }
                else {
                    category[key] = req.body[key];
                }
            }
        });
        await category.save();
        res.json({
            success: true,
            message: 'Category updated successfully',
            data: { category },
        });
    }
    /**
     * Delete category
     */
    async deleteCategory(req, res) {
        const { id } = req.params;
        const category = await Category_1.default.findById(id);
        if (!category) {
            throw new error_1.AppError('Category not found', 404);
        }
        // Check if category has subcategories
        const subcategoriesCount = await Category_1.default.countDocuments({ parent: id });
        if (subcategoriesCount > 0) {
            throw new error_1.AppError('Cannot delete category with subcategories. Delete subcategories first.', 400);
        }
        // Check if category has products
        if (category.productCount > 0) {
            throw new error_1.AppError('Cannot delete category with products. Move or delete products first.', 400);
        }
        await category.deleteOne();
        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    }
}
exports.CategoryController = CategoryController;
exports.categoryController = new CategoryController();
//# sourceMappingURL=category.controller.js.map