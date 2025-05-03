import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup } from "../../../types/roles";
import { CategoriesView } from "../../../components/categories/CategoriesView";
import { CategoriesLayout } from "../../../components/categories/CategoriesLayout";

function CategoriesList() {
  return (
    <AdminLayout>
      <CategoriesLayout>
        <CategoriesView type="competencies" />
      </CategoriesLayout>
    </AdminLayout>
  );
}

export default withAuth(CategoriesList, AdminGroup);
