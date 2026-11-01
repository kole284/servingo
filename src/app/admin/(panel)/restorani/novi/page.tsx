import { AdminPage } from "../../../ui";
import { RestaurantForm } from "../restaurant-form";

export default function NewRestaurantPage() {
  return (
    <AdminPage title="Novi restoran">
      <RestaurantForm />
    </AdminPage>
  );
}
