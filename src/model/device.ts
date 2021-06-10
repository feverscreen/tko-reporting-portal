import { EventTableItem } from "@/model/request-handler";
import DBHandler from "@/model/db-handler";

export default function Device(
  id: string,
  name = "",
  dbHandler: ReturnType<typeof DBHandler>
) {
  return {
    get id() {
      return id;
    },
    get name() {
      return name;
    },
    set name(newName: string) {
      this.name = newName;
      dbHandler.updateDeviceName(this.id, newName);
    },
  };
}
