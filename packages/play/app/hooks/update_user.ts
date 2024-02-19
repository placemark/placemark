import { atom, useAtom } from "jotai";

type User = any;

const AVOID_REFETCH = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

type MinimalUser = Pick<User, "areaUnits" | "lengthUnits">;
const userLikeAtom = atom<MinimalUser>({
  areaUnits: "meters",
  lengthUnits: "meters",
});

/**
 * Use and modify a user setting without
 * triggering a refetch.
 */
export function useUpdateMaybeUser() {
  const [userLike, setUserLike] = useAtom(userLikeAtom);
  const [updateUserOptionsMutation] = useMutation(updateUserOptions);
  const [user, { setQueryData }] = useQuery(
    getMaybeCurrentUser,
    null,
    AVOID_REFETCH
  );

  return {
    user: user || userLike,
    setUser: async (param: Partial<MinimalUser>) => {
      if (user) {
        const updatedUser = await updateUserOptionsMutation(param);
        void setQueryData(updatedUser, { refetch: false });
      } else {
        setUserLike((userLike) => {
          return {
            ...userLike,
            ...param,
          };
        });
      }
    },
  };
}
