import { SharedArray } from 'k6/data';

export function loadUsers() {
  const dataPath = import.meta.resolve('../data/users.json');
  return new SharedArray('quickpizza-demo-users', () => JSON.parse(open(dataPath)).users);
}