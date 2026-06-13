# Coupons

Previously it was discussed that there were supposed to be two types of coupons: basic and special. What happened was when acessing `/business/coupons`, the type of coupon is just a dropdown selection and all other fields are the same independent of type, making it redundant.

So let's rethink how this could work and then decide the spec.

When referring to coupons, a business can:

1. Have no coupon at all, paying only for showing on the catalog, but their profile would show lower on search results as we will give precedence to whoever offers benefits.
2. Have a coupon that can be used infinite times, example I want to provide 5% discount for all residents, to increase loyalty.
3. Have a coupon that resets every-so-ofter per user, example a 10% discount every week (or 4 of those every month), that resets weekly or monthly. This is good to encourage people to come back often.
4. Have a time-gated coupon, single-day or a with a start and end date. That is good for events and specific campaigns, like football matches.
5. Having a coupon that has a total limit instead of being per user. Example: the first 50 clients get 20% discount.
6. Have a coupon that is tied to a single specific item instead of the entire order. For that the coupon should have a field to add the price per unit of that item, and how many max units the coupon applies to. So on checkout instead of asking for the total amount, we would ask for the amount of items to apply the discount for. Example giving 50% discount on items that are about to expire.
7. Have BOGO coupon. Buy One Get One Free or also known as double. So for every 1 item the user buys, he gets 1 free. Other rules are similar to 5 above. Example "Double Chopp for today's game" coupon.
8. Similar to 6 above, buy X get Y free. Example buy a wine and get a free dessert.

Some of those could be live at the same time, like having a basic 5% discount coupon that is limited to be used once weekly and another BOGO coupon for a specific item. And they could be combined, like buy X get Y free only for today. They would be displayed as separate coupons at the coupon page and cannot be redeemed together. I think basically that was the idea of the "basic" vs "special" coupon that we had before and it made no difference at all because it was just a dropdown that didn't have any effect on the fields or behavior.

## Coupon UI

When referring to coupons, we need to specify a name for the coupon and at `/business/coupons` we show a list of all coupons the business can create, and there is only one Create Coupon button. Clicking on it, a modal opens with the following fields:

1. Name
2. Description
3. Type of coupon (dropdown menu)
4. Active
5. Valid From
6. Valid Until
7. Global Cap
8. User Cap
9. Discount
10. Discount applies to
11. Discount Type
12. Max Units
13. Max Units Per Redemption
14. Valid for Businesses

Feel free to grill me on this, let's create a system that is dynamic but also doesn't get confusing to the business or the end user.

---

## Suggestion: Coupons

Here's a proposal for a more flexible and intuitive coupon system, addressing the issues of the "basic vs special" distinction and the potentially confusing UI. The goal is to provide businesses with powerful tools while keeping the interface simple and easy to use.

### Core Concept: Dynamic Coupon Engine

Instead of rigid coupon types, let's use a flexible system where businesses can create custom coupons with a combination of "behaviors" (features) and "restrictions" (limits). This allows for a wide range of promotions without needing a complex classification system.

### Key Components

1. **Coupon Behaviors (What the coupon does)**
   These define the core functionality of the coupon. Businesses can select multiple behaviors that apply simultaneously.
   - **Percentage Discount**: Standard percentage-based discount (e.g., 10% off). Businesses can specify the discount amount (e.g., "10").
   - **Fixed Amount Discount**: Fixed monetary value discount (e.g., R$5 off). Businesses can specify the discount amount.
   - **Buy X Get Y Free**: Offers free items based on the quantity purchased. Businesses specify the "buy" quantity (X) and the "get" quantity (Y). This covers BOGO (Buy 1 Get 1 Free), Buy 2 Get 1 Free, etc.
   - **Item-Specific Discount**: Discount applied to specific items instead of the entire order. Businesses can specify the item (if applicable) and the discount details.

2. **Coupon Restrictions (How the coupon behaves)**
   These define the limitations and rules that govern the coupon's usage.
   - **Usage Limits**:
     - **Global Cap**: Maximum number of times the coupon can be used across all residents.
     - **User Cap**: Maximum number of times a single resident can use the coupon.
   - **Time Constraints**:
     - **Valid From**: Start date/time for coupon availability.
     - **Valid Until**: End date/time for coupon availability.
   - **Usage Pattern**:
     - **Per Day**: Coupon can be used once per day per resident.
     - **Per Week**: Coupon can be used once per week per resident.
     - **Per Month**: Coupon can be used once per month per resident.
     - **One-Time**: Coupon can be used only once ever per resident.
   - **Quantity Limits**:
     - **Max Units per Redemption**: Maximum number of items or units the coupon applies to in a single redemption.
   - **Application Scope**:
     - **All Items**: Coupon applies to the entire order.
     - **Specific Categories**: Coupon applies only to items in selected categories.
     - **Specific Items**: Coupon applies only to selected items.

### Simplified User Interface

The "Create Coupon" modal would be streamlined to reflect this dynamic system:

```
Create New Coupon

1. Coupon Name
   [_________________________]

2. Description
   [_________________________]
   (Optional: What this coupon offers)

3. Coupon Behavior (Select one primary type)
   - [ ] Percentage Discount (e.g., 10% off)
   - [ ] Fixed Amount Discount (e.g., R$5 off)
   - [ ] Buy X Get Y Free
   - [ ] Item-Specific Discount

   (Conditional fields based on selection)
   - For Percentage/Fixed Amount: 
     Amount: [___] %
     Applies to: [Entire Order ▼] [All Items ▼]  [Specific Categories ▼] [Specific Items ▼]
   - For Buy X Get Y: 
     Buy [___] Get [___] Free
     (Optional) Applies to: [Entire Order ▼] [All Items ▼]  [Specific Categories ▼] [Specific Items ▼]
   - For Item-Specific: 
     Select Items:
     [_________________________] (Search/select items)
     [+] Add Item
     Discount: [___] % or [___] R$ (per item)
     Max Units per Redemption: [___]

4. Restrictions
   - Active: [✓] [ ]
   - Valid From: [___________]  (Optional)
   - Valid Until: [___________]  (Optional)
   
   Usage Frequency:
   - [ ] One-Time per resident
   - [ ] Per Day
   - [ ] Per Week
   - [ ] Per Month
   
   Limits:
   - Global Cap: [___] redemptions (or ∞ for no limit)
   - User Cap: [___] redemptions per resident (or ∞ for no limit)
   - (Optional) Max Units per Redemption: [___]

5. Apply To
   [✓] All Businesses (Default)
   [ ] Select Businesses (Choose specific businesses)
```

### Example Configurations

Here's how this system would support the different coupon types discussed:

**1. General 5% Discount (Infinite Use, Per User)**
```
- Behavior: Percentage Discount (5%)
- Applies to: All Items
- Usage Pattern: Per Day (or Per Week)
- Global Cap: ∞
- User Cap: ∞
```
*Result: A simple, always-available discount for loyal customers.*

**2. Weekly "Double Chopp" (2-for-1)**
```
- Behavior: Buy X Get Y Free (Buy 1, Get 1 Free)
- Applies to: Specific Item (e.g., "Chopp")
- Usage Pattern: Per Week
- Global Cap: ∞
- User Cap: ∞
```
*Result: Customers can get a free chopp with every one they buy, once per week.*

**3. Limited-Time 20% Discount**
```
- Behavior: Percentage Discount (20%)
- Applies to: All Items
- Usage Pattern: One-Time
- Valid Until: [Date/Time]
- Global Cap: 500 redemptions
- User Cap: 2 redemptions per resident
```
*Result: An attractive flash sale that encourages immediate purchases.*

**4. "Buy 3, Get 1 Free" on Specific Items**
```
- Behavior: Buy X Get Y Free (Buy 3, Get 1 Free)
- Applies to: Specific Items (e.g., pastries, beverages)
- Usage Pattern: One-Time
- Global Cap: ∞
- User Cap: ∞
```
*Result: Customers who buy multiple units get extras for free, encouraging bulk purchases.*

**5. New Customer Welcome Offer**
```
- Behavior: Fixed Amount Discount (R$10)
- Applies to: All Items
- Usage Pattern: One-Time
- User Cap: 1 per resident
```
*Result: A special welcome gift for new residents joining the platform.*

### Benefits of This Approach

1. **Simplicity**: Businesses only interact with the features they need. If they want a simple discount, they only fill in the basic fields. If they want complex offers, they can enable additional options.

2. **Flexibility**: The combination of behaviors and restrictions allows for virtually any promotion a business might want to create, without needing new coupon types.

3. **No Redundant Types**: The "basic vs special" distinction is eliminated. All coupons are created through the same interface, with the behavior and restrictions defining their nature.

4. **Clear Communication**: The UI clearly separates "what the coupon does" (behaviors) from "how it works" (restrictions), making it easier for businesses to understand their own promotions.

5. **Scalable**: As new promotional needs arise, the system can be extended by adding new behaviors or restrictions without redesigning the core structure.

### Implementation Considerations

- **Validation Logic**: The backend must validate that coupon configurations are logical. For example, if "Buy X Get Y Free" is selected, X must be greater than 0, and Y must be greater than or equal to 0. The system should also validate that the "Applies to" scope is compatible with the selected behavior (e.g., item-specific discounts must be on items).
- **Database Structure**: The database schema would likely use a modular approach, with a core `coupons` table and separate tables or JSON fields for behaviors and restrictions. This allows for easy extension.
- **Code Generation**: The backend coupon validation logic can be generated programmatically from the configuration, reducing the amount of conditional code and making it easier to maintain.

---

# Profile Content

## Posts and Events

Eventually the app will have together with the catalog/search system of businesses, the user will see a timeline similar to instagram with their own coupon redemptions listed together with what content the businesses posted recently. So businesses can create a "post" with text, images, videos and other media to promote their business, these posts can be:
- general content of the business
- Call To Actions, example "Check our menu" with a link to their digital menu link, or "Visit our store" with a link to their website or Google Maps
- They can be tied to coupons
- Posts for specific events, so if I have a "double chopp" coupon for a specific day, I can create a post for that day and tie the coupon to it, so users can see the post and the coupon in the same place. Example a world cup game.

Events will be created and listed as posts, to keep it simple for the MVP. Eventually we will want to have an integration with email systems and whatsapp groups where people can get notified of whatever is happening in the neighborhood that week, and businesses can opt to pay a small fee to have their posts and events promoted to more people and get analytics on the engagement. But for now we will just have a timeline of posts and events.

## Edit Profile

I know the backend for the opening dates and times allows for having a day that does not have times aka the business closes, but on the frontend it only displays all days of the week, maybe we should allow the business to remove a day from the list if they are closed on that day? This would be helpful for businesses that have irregular schedules. Also if I incorrectly type a time for a day that I am closed, I can input backspace to remove what I typed, but that is not clear on the UI for the user.

---

# Checkout

Nowadays the checkout page was only made thinking about having a percentual discount, which we ask for the total amount of the order and the discount comes from the coupon that is being redeemed. We need to make the checkout page to be able to handle all the new coupon types that we defined in the coupon system, including buy X get Y free, fixed amount discounts, buy X get Y free, item-specific discounts, etc. 

