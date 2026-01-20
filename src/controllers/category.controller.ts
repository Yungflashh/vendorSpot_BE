import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import Category from '../models/Category';
import { AppError } from '../middleware/error';
import { generateSlug } from '../utils/helpers';

export class CategoryController {
  /**
   * Create category
   */
  async createCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { name, description, image, icon, parent } = req.body;

    // Generate slug
    const slug = generateSlug(name);

    // Check if slug exists
    const existing = await Category.findOne({ slug });
    if (existing) {
      throw new AppError('Category with this name already exists', 400);
    }

    // Determine level
    let level = 0;
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        throw new AppError('Parent category not found', 404);
      }
      level = parentCategory.level + 1;
    }

    const category = await Category.create({
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
  async getCategories(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { parent = null, level } = req.query;

    const filter: any = { isActive: true };
    if (parent !== undefined) {
      filter.parent = parent === 'null' ? null : parent;
    }
    if (level !== undefined) {
      filter.level = parseInt(level as string);
    }

    const categories = await Category.find(filter)
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
  async getCategoryTree(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    // Get all root categories
    const rootCategories = await Category.find({
      parent: null,
      isActive: true,
    }).sort({ order: 1, name: 1 });

    // Build tree
    const tree = await Promise.all(
      rootCategories.map(async (category) => {
        const subcategories = await Category.find({
          parent: category._id,
          isActive: true,
        }).sort({ order: 1, name: 1 });

        return {
          ...category.toObject(),
          subcategories,
        };
      })
    );

    res.json({
      success: true,
      data: { categories: tree },
    });
  }

  /**
   * Get single category
   */
  async getCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true }).populate(
      'parent',
      'name slug'
    );

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Get subcategories
    const subcategories = await Category.find({
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
  async updateCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const allowedUpdates = ['name', 'description', 'image', 'icon', 'order', 'isActive'];

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === 'name') {
          category.name = req.body[key];
          category.slug = generateSlug(req.body[key]);
        } else {
          (category as any)[key] = req.body[key];
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
  async deleteCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Check if category has subcategories
    const subcategoriesCount = await Category.countDocuments({ parent: id });
    if (subcategoriesCount > 0) {
      throw new AppError(
        'Cannot delete category with subcategories. Delete subcategories first.',
        400
      );
    }

    // Check if category has products
    if (category.productCount > 0) {
      throw new AppError(
        'Cannot delete category with products. Move or delete products first.',
        400
      );
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  }
}

export const categoryController = new CategoryController();
