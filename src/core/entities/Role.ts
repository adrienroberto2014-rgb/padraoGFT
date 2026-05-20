export interface Role {
  id: string;
  name: string;
  permissions: {
    [key: string]: boolean;
  };
}
