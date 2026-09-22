The nested loop compared every order with every user. Orders are now grouped by user id in a dictionary lookup index, so UserId is read about once per order.
