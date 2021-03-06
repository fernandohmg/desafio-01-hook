import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    prevCartRef.current = cart;
  });

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cartPreviousValue, cart]);

  const addProduct = async (productId: number) => {
    try {
      const { data: productDataApi } = await api.get<Product>(
        `products/${productId}`
      );

      const { data: stockDataApi } = await api.get<Stock>(`stock/${productId}`);

      const productInCart = cart.find((item) => item.id === productId);

      if (productInCart) {
        if (productInCart.amount >= stockDataApi.amount) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          updateProductAmount({
            productId,
            amount: productInCart ? productInCart.amount + 1 : 1,
          });
        }
      } else {
        setCart([...cart, { ...productDataApi, amount: 1 }]);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((item) => item.id === productId)) {
        throw Error();
      }
      const cartUpdated = cart.filter((item) => item.id !== productId);
      if (cartUpdated) {
        setCart(cartUpdated);
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        throw Error();
      }
      const { data: stockDataApi } = await api.get<Stock>(`stock/${productId}`);

      if (amount > stockDataApi.amount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        const updatedProducts = cart.map((item) => {
          if (item.id === productId) {
            return {
              ...item,
              amount: amount,
            };
          }
          return item;
        });
        setCart(updatedProducts);
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
