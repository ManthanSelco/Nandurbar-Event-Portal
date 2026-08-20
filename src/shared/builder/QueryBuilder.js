class QueryBuilder {
  constructor(modelQuery, query) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchFields = []) {
    const searchTerm = this.query.search;

    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchFields.map((field) => ({
          [field]: {
            $regex: searchTerm,
            $options: "i",
          },
        })),
      });
    }

    return this;
  }

  filter() {
    const queryObj = { ...this.query };

    const excludeFields = [
      "search",
      "sortBy",
      "sortOrder",
      "page",
      "limit",
    ];

    excludeFields.forEach((field) => delete queryObj[field]);

    if (!queryObj.isDeleted) {
      queryObj.isDeleted = false;
    }

    this.modelQuery = this.modelQuery.find(queryObj);

    return this;
  }

  sort() {
    const sortBy = this.query.sortBy || "createdAt";
    const sortOrder = this.query.sortOrder === "asc" ? 1 : -1;

    this.modelQuery = this.modelQuery.sort({
      [sortBy]: sortOrder,
    });

    return this;
  }

  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    const skip = (page - 1) * limit;

    this.page = page;
    this.limit = limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);

    return this;
  }

  async execute() {
    return await this.modelQuery;
  }
}

export default QueryBuilder;